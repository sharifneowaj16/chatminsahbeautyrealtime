export function getPathaoWebhookIntegrationSecret(): string | null {
  const secret = process.env.PATHAO_WEBHOOK_INTEGRATION_SECRET?.trim();
  return secret || null;
}

export function isPathaoWebhookIntegrationSecretConfigured(): boolean {
  return Boolean(getPathaoWebhookIntegrationSecret());
}

export function getPathaoWebhookCallbackUrl(origin?: string): string {
  const baseUrl =
    process.env.PATHAO_WEBHOOK_CALLBACK_URL?.trim().replace(/\/api\/webhooks\/pathao\/?$/, '') ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    origin ||
    'https://minsahbeauty.cloud';

  return `${baseUrl.replace(/\/+$/, '')}/api/webhooks/pathao`;
}
