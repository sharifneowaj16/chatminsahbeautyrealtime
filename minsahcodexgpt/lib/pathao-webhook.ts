export const DEFAULT_PATHAO_WEBHOOK_INTEGRATION_SECRET = 'f3992ecc-59da-4cbe-a049-a13da2018d51';

export function getPathaoWebhookIntegrationSecret(): string {
  return process.env.PATHAO_WEBHOOK_INTEGRATION_SECRET?.trim() || DEFAULT_PATHAO_WEBHOOK_INTEGRATION_SECRET;
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
