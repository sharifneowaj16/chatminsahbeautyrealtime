import HomeSectionGuidePage from '../_components/HomeSectionGuidePage';

export default function HomeSectionSlidesPage() {
  return (
    <HomeSectionGuidePage
      title="Hero & Slides"
      description="Control the homepage hero banner copy, image, and CTA buttons."
      tips={[
        'Use Hero / Banner Builder on the main page for headline, subtitle, image URL, and CTA links.',
        'The Promotion section visibility controls whether the hero area appears in the homepage order.',
        'Hero image supports /uploads paths or external image URLs allowed by the Next Image config.',
        'Use short benefit-focused copy for a premium first-fold impression.',
      ]}
    />
  );
}
