import { verifyGitHubWebhookSignature } from "../../../../lib/github/webhook-verify";

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (typeof value === "string" && value.length > 0) return value;

  throw new Error(
    `Missing required environment variable: ${name}. Set it in apps/web/.env.local for local dev, or in your Vercel project environment variables.`,
  );
}

async function routeEvent(event: string | null): Promise<string> {
  if (!event) return "unknown";
  switch (event) {
    case "installation":
    case "installation_repositories":
    case "pull_request":
      return event;
    default:
      return "unknown";
  }
}

export async function POST(request: Request): Promise<Response> {
  const secret = readRequiredEnv("GITHUB_WEBHOOK_SECRET");
  const signatureHeader = request.headers.get("x-hub-signature-256");

  const body = await request.text();
  const ok = verifyGitHubWebhookSignature({ secret, payload: body, signatureHeader });
  if (!ok) return new Response("Invalid signature", { status: 401 });

  const event = request.headers.get("x-github-event");
  const handledEvent = await routeEvent(event);

  return Response.json({ ok: true, handledEvent }, { status: 200 });
}
