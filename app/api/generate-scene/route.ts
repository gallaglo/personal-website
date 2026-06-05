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

        // 1. Create session to pass initial input to the agent via session state
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
        // Creation may return an LRO; actual session resource is in response.name
        const sessionName: string = session.response?.name ?? session.name;
        const sessionId = sessionName.split("/").pop();

        send("progress", { message: "Session created, running pipeline…" });

        // 2. streamQuery — called directly on the reasoning engine
        const queryRes = await fetch(`${baseUrl}/${resourceName}:streamQuery`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            input: {
              user_id: userId,
              session_id: sessionId,
              message: "generate",
            },
          }),
        });

        if (!queryRes.ok || !queryRes.body) {
          const text = await queryRes.text();
          send("error", {
            message: `Pipeline failed (${queryRes.status}): ${text}`,
          });
          return;
        }

        send("progress", { message: "Pipeline running…" });

        // 3. Parse the stream. Each line is a raw JSON object (not SSE).
        //    All output values come from actions.state_delta — no session GET needed.
        //
        //    vision_agent  → state_delta.scene_description  (progress signal)
        //    codegen_agent → state_delta.threejs_code        (last write wins)
        //    validator_agent function_response
        //                  → state_delta.validation_score    (last write wins)
        //                  → state_delta.validation_feedback
        //                  → actions.escalate == true        (pipeline done)
        let threejsCode: string | null = null;
        let validationScore: number | null = null;
        let validationFeedback: string | null = null;

        const reader = queryRes.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        outer: while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const event = JSON.parse(trimmed) as Record<string, unknown>;
              const sd = (
                (event.actions as Record<string, unknown>)
                  ?.state_delta as Record<string, unknown>
              ) ?? {};

              if (typeof sd.scene_description === "string") {
                send("progress", {
                  message: "Scene analyzed, generating code…",
                });
              }
              if (typeof sd.threejs_code === "string") {
                threejsCode = sd.threejs_code;
                send("progress", {
                  message: "Code generated, running validation…",
                });
              }
              if (typeof sd.validation_score === "number") {
                validationScore = sd.validation_score;
                validationFeedback =
                  typeof sd.validation_feedback === "string"
                    ? sd.validation_feedback
                    : validationFeedback;
              }

              // escalate: true means the loop has exited — pipeline is done
              if ((event.actions as Record<string, unknown>)?.escalate === true) {
                break outer;
              }
            } catch {
              // skip malformed lines
            }
          }
        }

        if (threejsCode) {
          send("result", {
            threejs_code: threejsCode,
            validation_score: validationScore,
            validation_feedback: validationFeedback,
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
