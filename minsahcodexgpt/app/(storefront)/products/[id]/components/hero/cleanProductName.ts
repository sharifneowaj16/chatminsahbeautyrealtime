/**
 * Clean Product Display Name Utility
 *
 * Removes delivery badges/suffixes like "(Standard Delivery)", "(Free Delivery)",
 * or "(Free Delivery Offer)" from product display names forever in the storefront hero,
 * while preserving 100% of underlying shipping and pricing logic.
 */
export function cleanProductName(name?: string | null): string {
  if (!name || typeof name !== 'string') return '';
  return name
    .replace(/\s*[\(\[]\s*(?:standard|free)\s+deli?ve?ry(?:\s+offer)?\s*[\)\]\}]/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export default cleanProductName;
