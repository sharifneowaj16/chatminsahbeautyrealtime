// DISABLED: SSE stream replaced by WebSocket in realtime-service
export async function GET() {
  return new Response(
    JSON.stringify({ disabled: true, reason: 'Replaced by WebSocket' }),
    { status: 410 }
  )
}
