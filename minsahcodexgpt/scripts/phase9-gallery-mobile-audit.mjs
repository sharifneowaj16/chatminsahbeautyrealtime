#!/usr/bin/env node
import fs from 'node:fs';

const checks = [];
const read = (file) => fs.readFileSync(file, 'utf8');
const galleryPath = 'app/products/[id]/components/ProductGallery.tsx';
const gallery = read(galleryPath);
const productClient = read('app/products/[id]/components/ProductClient.tsx');
const phaseDocExists = fs.existsSync('PHASE9_GALLERY_MOBILE_USABILITY.md');

function check(name, passed) {
  checks.push({ name, passed: Boolean(passed) });
}

check('ProductGallery component exists', fs.existsSync(galleryPath));
check('Main gallery image uses object-contain to avoid product packaging crop', gallery.includes('object-contain p-3') || gallery.includes('object-contain p-4'));
check('Gallery no longer uses object-cover', !gallery.includes('object-cover'));
check('Thumbnails use object-contain', gallery.includes('className="w-full h-full object-contain"'));
check('Main image area is keyboard focusable', gallery.includes('role="button"') && gallery.includes('tabIndex={0}'));
check('Main image has zoom aria-label', gallery.includes('aria-label={`${productName} ছবি বড় করে দেখুন'));
check('Keyboard enter/space opens zoom', gallery.includes("event.key === 'Enter'") && gallery.includes("event.key === ' '"));
check('Keyboard arrows navigate gallery', gallery.includes("event.key === 'ArrowLeft'") && gallery.includes("event.key === 'ArrowRight'"));
check('Zoom modal supports Escape close', gallery.includes("event.key === 'Escape'") && gallery.includes('setZoomed(false)'));
check('Zoom modal locks body scroll while open', gallery.includes('document.body.style.overflow = \'hidden\''));
check('Zoom overlay is a dialog', gallery.includes('role="dialog"') && gallery.includes('aria-modal="true"'));
check('Zoom close button has aria label', gallery.includes('aria-label="বড় ছবি বন্ধ করুন"'));
check('Gallery arrows have accessible labels', gallery.includes('aria-label="আগের ছবি দেখুন"') && gallery.includes('aria-label="পরের ছবি দেখুন"'));
check('Zoom arrows have accessible labels', gallery.includes('aria-label="বড় ছবিতে আগের ছবি দেখুন"') && gallery.includes('aria-label="বড় ছবিতে পরের ছবি দেখুন"'));
check('Arrow and close controls meet mobile touch target class', (gallery.match(/min-h-11 min-w-11/g) || []).length >= 5);
check('Thumbnail buttons are larger mobile touch targets', gallery.includes('min-h-16 min-w-16') && gallery.includes('md:w-20 md:h-20'));
check('Thumbnail row supports horizontal snap scrolling', gallery.includes('snap-x snap-mandatory') && gallery.includes('snap-start'));
check('Thumbnails expose selected state', gallery.includes('aria-pressed={i === activeIdx && !variantUrl}'));
check('Visible zoom hint exists', gallery.includes('ছবি বড় করুন'));
check('Visible image counter exists', gallery.includes('ছবি ${activeIdx + 1} / ${safeImages.length}'));
check('Variant image indicator remains present', gallery.includes('ভেরিয়েন্ট ইমেজ'));
check('ProductClient still renders ProductGallery', productClient.includes('<ProductGallery'));
check('Phase 9 documentation exists', phaseDocExists);
check('Phase 4 delivery audit script still exists', fs.existsSync('scripts/phase4-delivery-regression-audit.mjs'));
check('Phase 5 trust audit script still exists', fs.existsSync('scripts/phase5-product-trust-audit.mjs'));
check('Phase 6 details audit script still exists', fs.existsSync('scripts/phase6-product-details-audit.mjs'));
check('Phase 7 FBT audit script still exists', fs.existsSync('scripts/phase7-fbt-audit.mjs'));
check('Phase 8 related products audit script still exists', fs.existsSync('scripts/phase8-related-products-audit.mjs'));

let passed = 0;
for (const item of checks) {
  if (item.passed) passed += 1;
  console.log(`${item.passed ? '✅' : '❌'} ${item.name}`);
}

console.log(`\nPhase 9 gallery/mobile audit: ${passed}/${checks.length} checks passed.`);
process.exit(passed === checks.length ? 0 : 1);
