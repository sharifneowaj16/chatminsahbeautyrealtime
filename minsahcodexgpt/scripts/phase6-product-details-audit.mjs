#!/usr/bin/env node
import fs from 'node:fs';

const checks = [];
const read = (file) => fs.readFileSync(file, 'utf8');
const productClient = read('app/products/[id]/components/ProductClient.tsx');
const phaseDocExists = fs.existsSync('PHASE6_PRODUCT_DETAILS_RESTRUCTURE.md');

function check(name, passed) {
  checks.push({ name, passed: Boolean(passed) });
}

check('ProductClient has reusable details accordion item', productClient.includes('function DetailsAccordionItem'));
check('Product details use native details element', productClient.includes('<details') && productClient.includes('group overflow-hidden rounded-2xl'));
check('Accordion has controlled toggle state for native details', productClient.includes('const [isOpen, setIsOpen] = useState(defaultOpen);') && productClient.includes('onToggle={(event) => setIsOpen(event.currentTarget.open)}'));
check('Overview and description accordion exists', productClient.includes('title="Overview & description"') || productClient.includes('title="ওভারভিউ ও বর্ণনা"'));
check('Overview accordion is default open', productClient.includes('title="Overview & description"') || productClient.includes('title="ওভারভিউ ও বর্ণনা"') && productClient.includes('defaultOpen'));
check('How to use and ingredients accordion exists', productClient.includes('title="How to use & ingredients"') || productClient.includes('title="ব্যবহারবিধি ও উপাদান"'));
check('Specs and product information accordion exists', productClient.includes('title="Specs & product information"') || productClient.includes('title="স্পেসিফিকেশন ও পণ্যের তথ্য"'));
check('Shade and variant guide accordion exists', productClient.includes('title="Shade & variant guide"') || productClient.includes('title="শেড ও ভ্যারিয়েন্ট গাইড"'));
check('Offer and helpful links accordion exists', productClient.includes('title="Offer & helpful links"') || productClient.includes('title="অফার ও সহায়ক লিংক"'));
check('SEO intro still rendered', productClient.includes('{product.seoIntro}') && productClient.includes('SEO intro'));
check('Full product description still rendered', productClient.includes('{product.description}'));
check('Bengali description still rendered', productClient.includes('{product.bengaliDescription}'));
check('Ingredients still rendered', productClient.includes('{product.ingredients}'));
check('Description sections block retained', productClient.includes('<DescriptionSectionsBlock sections={descriptionSections} />'));
check('Info rows block retained', productClient.includes('function InfoRowsBlock'));
check('Internal links block retained', productClient.includes('<InternalLinksBlock value={product.internalLinks} />'));
check('Old ingredient expand state removed', !productClient.includes('setExpandIngredients') && !productClient.includes('expandIngredients'));
check('Gift feature flag remains off', productClient.includes('const ENABLE_GIFT_REQUEST = false;'));
check('Phase 6 documentation exists', phaseDocExists);
check('Phase 4 delivery audit script still exists', fs.existsSync('scripts/phase4-delivery-regression-audit.mjs'));
check('Phase 5 trust audit script still exists', fs.existsSync('scripts/phase5-product-trust-audit.mjs'));

let passed = 0;
for (const item of checks) {
  if (item.passed) passed += 1;
  console.log(`${item.passed ? '✅' : '❌'} ${item.name}`);
}

console.log(`\nPhase 6 product details audit: ${passed}/${checks.length} checks passed.`);
process.exit(passed === checks.length ? 0 : 1);
