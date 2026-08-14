import HomeSectionGuidePage from '../_components/HomeSectionGuidePage';

export default function HomeSectionCombosPage() {
  return (
    <HomeSectionGuidePage
      title="Homepage Combos"
      description="Control the combo section title, subtitle, order, visibility, and CTA link."
      tips={[
        'Set the Combo Deals title/subtitle from the main Homepage Builder row.',
        'Use the advanced CTA URL to point View All to /combos or any campaign page.',
        'Hide the section instantly by turning off visibility.',
        'Move the section up or down to change public homepage order.',
      ]}
    />
  );
}
