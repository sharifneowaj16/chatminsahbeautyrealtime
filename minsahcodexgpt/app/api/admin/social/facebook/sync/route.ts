// DISABLED: Inbox sync moved to realtime-service
// This route was causing 10-15 second delays
export async function GET() {
  return new Response(
    JSON.stringify({ disabled: true, reason: 'Moved to realtime-service' }),
    { status: 410 }
  )
}

export async function POST() {
  return new Response(
    JSON.stringify({ disabled: true, reason: 'Moved to realtime-service' }),
    { status: 410 }
  )
}
