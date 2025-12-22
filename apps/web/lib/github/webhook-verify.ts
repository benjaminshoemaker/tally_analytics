import crypto from "node:crypto";

export function verifyGitHubWebhookSignature(options: {
  secret: string;
  payload: string;
  signatureHeader: string | null;
}): boolean {
  const { secret, payload, signatureHeader } = options;

  if (!signatureHeader) return false;
  if (!signatureHeader.startsWith("sha256=")) return false;

  const providedHex = signatureHeader.slice("sha256=".length);
  if (!/^[0-9a-f]{64}$/i.test(providedHex)) return false;

  const expectedHex = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const provided = Buffer.from(providedHex, "hex");
  const expected = Buffer.from(expectedHex, "hex");
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(provided, expected);
}

