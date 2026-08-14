import HomeSectionGuidePage from '../_components/HomeSectionGuidePage';

export default function HomeSectionBrandsPage() {
  return (
    <HomeSectionGuidePage
      title="Homepage Brands"
      description="Control brand section visibility, order, item limit, and selected brand IDs/slugs."
      tips={[
        'Paste brand IDs, slugs, or names into the Popular Brands advanced settings.',
        'If no brands are selected, default homepage brands are used as a safe fallback.',
        'Items To Show controls how many brand circles appear.',
        'The section CTA can point to /brands or a custom brand campaign page.',
      ]}
    />
  );
}
