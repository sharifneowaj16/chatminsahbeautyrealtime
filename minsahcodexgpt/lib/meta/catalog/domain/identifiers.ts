export function resolveCatalogIdentifiers(input: {
  variantGtin?: string | null;
  productGtin?: string | null;
  variantMpn?: string | null;
  productMpn?: string | null;
}) {
  const clean = (value?: string | null) => value?.trim() || undefined;
  return {
    gtin: clean(input.variantGtin) ?? clean(input.productGtin),
    mpn: clean(input.variantMpn) ?? clean(input.productMpn),
  };
}
