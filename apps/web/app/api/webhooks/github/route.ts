import { verifyGitHubWebhookSignature } from "../../../../lib/github/webhook-verify";
import { handleInstallationRepositoriesWebhook, handleInstallationWebhook } from "../../../../lib/github/handlers/installation";
import { handlePullRequestWebhook } from "../../../../lib/github/handlers/pull-request";

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (typeof value === "string" && value.length > 0) return value;

  throw new Error(
    `Missing required environment variable: ${name}. Set it in apps/web/.env.local for local dev, or in your Vercel project environment variables.`,
  );
}

async function routeEvent(event: string | null, payload: unknown): Promise<string> {
  if (!event) return "unknown";
  switch (event) {
    case "installation":
      await handleInstallationWebhook(payload);
      return event;
    case "installation_repositories":
      await handleInstallationRepositoriesWebhook(payload);
      return event;
    case "pull_request":
      await handlePullRequestWebhook(payload);
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

  let payload: unknown;
  try {
    payload = body.length > 0 ? JSON.parse(body) : null;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const event = request.headers.get("x-github-event");
  const handledEvent = await routeEvent(event, payload);

  return Response.json({ ok: true, handledEvent }, { status: 200 });
}
