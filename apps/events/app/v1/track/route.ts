export function GET() {
  return new Response("Method Not Allowed", { status: 405 });
}

export function POST() {
  return new Response("Not Implemented", { status: 501 });
}

