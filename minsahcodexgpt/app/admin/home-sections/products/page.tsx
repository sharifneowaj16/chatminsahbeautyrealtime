import HomeSectionGuidePage from '../_components/HomeSectionGuidePage';

export default function HomeSectionProductsPage() {
  return (
    <HomeSectionGuidePage
      title="Homepage Products"
      description="Choose which products appear in New Arrivals, Picked For You, Recommended Deals, Favorites, and Flash Sale."
      tips={[
        'Paste product IDs or slugs into the section advanced settings as comma-separated values.',
        'If no products are selected, the homepage uses smart fallback sorting by date, rating, featured state, or active flash-sale window.',
        'Items To Show controls the public homepage product limit.',
        'Out-of-stock and inactive products stay protected by homepage product-card logic.',
      ]}
    />
  );
}
