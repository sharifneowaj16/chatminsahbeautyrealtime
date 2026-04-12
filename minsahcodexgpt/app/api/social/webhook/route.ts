// DISABLED: Webhook moved to realtime-service at realtime.minsahbeauty.cloud/webhook/facebook
export async function GET() {
  return new Response('Moved', { status: 301 })
}

export async function POST() {
  return new Response(
    JSON.stringify({ error: 'Webhook endpoint moved to realtime service' }),
    { status: 410 }
  )
}
