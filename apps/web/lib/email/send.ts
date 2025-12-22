import { Resend } from "resend";

export type SendMagicLinkEmailInput = {
  to: string;
  loginUrl: string;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (typeof value === "string" && value.length > 0) return value;
  throw new Error(`Missing required environment variable: ${name}`);
}

export async function sendMagicLinkEmail({ to, loginUrl }: SendMagicLinkEmailInput): Promise<void> {
  const resend = new Resend(getRequiredEnv("RESEND_API_KEY"));
  const from = getRequiredEnv("FROM_EMAIL");

  await resend.emails.send({
    from,
    to,
    subject: "Your login link",
    html: `<p>Click to log in:</p><p><a href="${loginUrl}">${loginUrl}</a></p><p>This link expires in 15 minutes.</p>`,
  });
}

