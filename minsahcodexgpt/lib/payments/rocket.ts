/**
 * Rocket payment is intentionally disabled in production.
 *
 * To enable Rocket later, add a real provider adapter that creates an Order first,
 * verifies gateway status server-side, and reports paid status only through
 * /api/payments/verified. Do not reintroduce sandbox/mock success responses here.
 */

export const ROCKET_PAYMENT_DISABLED = 'ROCKET_PAYMENT_DISABLED' as const;

export class RocketPaymentDisabledError extends Error {
  constructor() {
    super('Rocket payment is disabled. Use canonical /api/orders + /api/payments/verified flow after adding a verified Rocket adapter.');
    this.name = 'RocketPaymentDisabledError';
  }
}

class DisabledRocketPaymentGateway {
  async createPayment(): Promise<never> {
    throw new RocketPaymentDisabledError();
  }

  async verifyPayment(): Promise<never> {
    throw new RocketPaymentDisabledError();
  }

  async refundPayment(): Promise<never> {
    throw new RocketPaymentDisabledError();
  }
}

export const rocket = new DisabledRocketPaymentGateway();
export default rocket;
