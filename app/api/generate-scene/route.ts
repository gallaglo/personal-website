import { GoogleAuth } from "google-auth-library";

const RESOURCE = process.env.AGENT_ENGINE_RESOURCE_NAME!;
const LOCATION = process.env.AGENT_ENGINE_LOCATION!;
const BASE_BETA = `https://${LOCATION}-aiplatform.googleapis.com/v1beta1`;

async function getToken() {
  const auth = new GoogleAuth({
    scopes: "https://www.googleapis.com/auth/cloud-platform",
  });
  return (await auth.getAccessToken())!;
}

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
    sessionState.image = Buffer.from(await imageFile.arrayBuffer()).toString("base64");
    sessionState.mime_type = imageFile.type;
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sse = (event: string, data: object) =>
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );

      try {
        const token = await getToken();
        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };

        // 1. Create session — flat body, no "session" wrapper
        const userId = crypto.randomUUID();
        const sessionRes = await fetch(`${BASE_BETA}/${RESOURCE}/sessions`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            user_id: userId,
            session_state: sessionState,
          }),
        });
        if (!sessionRes.ok) {
          throw new Error(`Session creation failed: ${await sessionRes.text()}`);
        }
        const sessionJson = await sessionRes.json();
        console.log("[generate-scene] session response:", JSON.stringify(sessionJson));
        // name is either a direct field or nested under response (LRO format)
        const sessionName: string = sessionJson.response?.name ?? sessionJson.name ?? "";
        const sessionId = sessionName.split("/").pop() ?? "";
        console.log("[generate-scene] sessionId:", sessionId);

        sse("progress", { message: "Session created, running pipeline…" });

        const queryBody = { input: { user_id: userId, session_id: sessionId, message: "" } };
        console.log("[generate-scene] streamQuery body:", JSON.stringify(queryBody));

        // 2. streamQuery — raw NDJSON response (no ?alt=sse)
        const queryRes = await fetch(`${BASE_BETA}/${RESOURCE}:streamQuery`, {
          method: "POST",
          headers,
          body: JSON.stringify(queryBody),
        });
        if (!queryRes.ok || !queryRes.body) {
          throw new Error(`streamQuery failed (${queryRes.status}): ${await queryRes.text()}`);
        }

        sse("progress", { message: "Pipeline running…" });

        // 3. Parse NDJSON — split on newlines, JSON-parse each non-empty line
        let threejs_code = "";
        let validation_score = 0;
        let validation_feedback = "";

        const reader = queryRes.body.pipeThrough(new TextDecoderStream()).getReader();
        let buf = "";
        outer: while (true) {
          const { done, value } = await reader.read();
          if (value) buf += value;
          let nl: number;
          while ((nl = buf.indexOf("\n")) !== -1) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!line) continue;
            const event = JSON.parse(line);
            const sd = event.actions?.state_delta;

            if (sd?.scene_description) {
              sse("progress", { message: "Scene analyzed, generating code…" });
            }
            if (sd?.threejs_code) {
              threejs_code = sd.threejs_code;
              sse("progress", { message: "Code generated, running validation…" });
            }
            if (typeof sd?.validation_score === "number") {
              validation_score = sd.validation_score;
              validation_feedback = sd.validation_feedback ?? "";
            }
            if (event.actions?.escalate) {
              sse("result", { threejs_code, validation_score, validation_feedback });
              controller.close();
              break outer;
            }
          }
          if (done) break;
        }

        // escalate not seen — emit whatever we have
        if (!controller.desiredSize && controller.desiredSize !== null) return; // already closed
        sse("result", { threejs_code, validation_score, validation_feedback });
      } catch (err) {
        sse("error", { message: String(err) });
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
