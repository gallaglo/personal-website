import { GoogleAuth } from "google-auth-library";

const resourceName = process.env.AGENT_ENGINE_RESOURCE_NAME!;
const location = process.env.AGENT_ENGINE_LOCATION!;

export async function POST(req: Request) {
  const formData = await req.formData();
  const imageFile = formData.get("image") as File | null;
  const prompt = (formData.get("prompt") as string) ?? "";

  if (!imageFile && !prompt) {
    return new Response("At least one of image or prompt is required", {
      status: 400,
    });
  }

  const sessionState: Record<string, string> = {};
  if (prompt) sessionState.prompt = prompt;
  if (imageFile) {
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    sessionState.image = buffer.toString("base64");
    sessionState.mime_type = imageFile.type;
  }

  const auth = new GoogleAuth({
    scopes: "https://www.googleapis.com/auth/cloud-platform",
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (eventType: string, data: object) => {
        controller.enqueue(
          encoder.encode(
            `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`
          )
        );
      };

      try {
        const token = await auth.getAccessToken();
        const baseUrl = `https://${location}-aiplatform.googleapis.com/v1beta1`;
        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };

        // 1. Create session — user_id and session_state are nested under "session"
        const userId = crypto.randomUUID();
        const sessionRes = await fetch(`${baseUrl}/${resourceName}/sessions`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            user_id: userId,
            session_state: sessionState,
          }),
        });

        if (!sessionRes.ok) {
          const text = await sessionRes.text();
          send("error", { message: `Failed to create session: ${text}` });
          return;
        }

        const session = await sessionRes.json();
        // Creation may return an LRO; the actual session resource is in response.name
        const sessionName: string = session.response?.name ?? session.name;
        const sessionId = sessionName.split("/").pop();

        send("progress", { message: "Session created, running pipeline…" });

        // 2. streamQuery — called on the reasoning engine directly; session context via body
        const queryRes = await fetch(
          `${baseUrl}/${resourceName}:streamQuery`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              input: {
                user_id: userId,
                session_id: sessionId,
                message: "generate",
              },
            }),
          }
        );

        if (!queryRes.ok || !queryRes.body) {
          const text = await queryRes.text();
          send("error", {
            message: `Pipeline failed (${queryRes.status}): ${text}`,
          });
          return;
        }

        send("progress", { message: "Pipeline running…" });

        // 3. Consume the SSE stream. Only set_validation_result tool calls carry
        //    structured data — buffer score/feedback, last call wins.
        //    All other events (model text, tool responses) are ignored.
        let validationScore: number | null = null;
        let validationFeedback: string | null = null;

        const reader = queryRes.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";

          for (const line of lines) {
            if (line.trim()) console.log("[stream-raw]", line);
            if (!line.startsWith("data:")) continue;
            const jsonStr = line.slice(5).trim();
            if (!jsonStr) continue;
            try {
              const event = JSON.parse(jsonStr) as Record<string, unknown>;
              console.log("[stream-event]", JSON.stringify(event));
              const parts =
                ((event.content as Record<string, unknown>)
                  ?.parts as unknown[]) ?? [];
              for (const part of parts) {
                if (typeof part !== "object" || part === null) continue;
                const p = part as Record<string, unknown>;
                const fc = p.function_call as
                  | Record<string, unknown>
                  | undefined;
                if (
                  fc?.name === "set_validation_result" &&
                  typeof fc.args === "object" &&
                  fc.args !== null
                ) {
                  const args = fc.args as Record<string, unknown>;
                  if (typeof args.score === "number")
                    validationScore = args.score;
                  if (typeof args.feedback === "string")
                    validationFeedback = args.feedback;
                }
              }
            } catch {
              // skip malformed lines
            }
          }
        }

        // 4. GET session state — the only reliable source for threejs_code.
        //    The agent may run on a different session than the one we created,
        //    so list sessions by userId and pick the most recently updated one.
        // The agent may run on a different session than the one we pre-created,
        // so list sessions by userId and pick the most recently updated one.
        const listRes = await fetch(
          `${baseUrl}/${resourceName}/sessions?filter=user_id="${userId}"`,
          { headers }
        );
        let resolvedSessionId = sessionId;
        if (listRes.ok) {
          const listBody = (await listRes.json()) as Record<string, unknown>;
          const sessions = (listBody.sessions as Record<string, unknown>[]) ?? [];
          if (sessions.length > 0) {
            sessions.sort((a, b) =>
              String(b.updateTime ?? "").localeCompare(String(a.updateTime ?? ""))
            );
            const latest = String(sessions[0].name ?? "");
            resolvedSessionId = latest.split("/").pop() ?? sessionId;
          }
        }

        const stateRes = await fetch(
          `${baseUrl}/${resourceName}/sessions/${resolvedSessionId}`,
          { headers }
        );

        if (!stateRes.ok) {
          const text = await stateRes.text();
          send("error", { message: `Failed to read session state: ${text}` });
          return;
        }

        const stateBody = (await stateRes.json()) as Record<string, unknown>;
        const state = (stateBody.sessionState ?? {}) as Record<string, unknown>;
        const threejsCode =
          typeof state.threejs_code === "string" ? state.threejs_code : null;

        // Prefer session state values; fall back to stream-buffered values
        const finalScore =
          typeof state.validation_score === "number"
            ? state.validation_score
            : validationScore;
        const finalFeedback =
          typeof state.validation_feedback === "string"
            ? state.validation_feedback
            : validationFeedback;

        if (threejsCode) {
          send("result", {
            threejs_code: threejsCode,
            validation_score: finalScore,
            validation_feedback: finalFeedback,
          });
        } else {
          send("error", {
            message: "Pipeline completed but no scene was generated.",
          });
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ message: String(err) })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
