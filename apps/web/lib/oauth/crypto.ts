import crypto from "node:crypto";

export function generateOpaqueToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function hashOAuthSecret(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function createS256CodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export function verifyPkceS256(params: { verifier: string; challenge: string }): boolean {
  const expected = createS256CodeChallenge(params.verifier);
  const expectedBuffer = Buffer.from(expected);
  const challengeBuffer = Buffer.from(params.challenge);
  if (expectedBuffer.length !== challengeBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, challengeBuffer);
}
