// DISABLED: Reply sending moved to realtime-service
// Use /api/admin/inbox/reply instead (which forwards to realtime-service)
export async function POST() {
  return new Response(
    JSON.stringify({ error: 'Use /api/admin/inbox/reply instead' }),
    { status: 410 }
  )
}
