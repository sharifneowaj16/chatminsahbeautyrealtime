import fs from 'node:fs';

const checks = [];
function check(label, condition) {
  checks.push({ label, ok: Boolean(condition) });
}
function read(path) {
  return fs.readFileSync(path, 'utf8');
}
function exists(path) {
  return fs.existsSync(path);
}

const checkout = read('app/checkout/page.tsx');
const orderRoute = read('app/api/orders/route.ts');
const orderValidation = read('lib/order-validation.ts');
const pathaoLocations = read('lib/pathao-locations.ts');
const areasRoute = read('app/api/shipping/pathao/areas/route.ts');
const availabilityFlags = exists('lib/pathao-availability-flags.ts') ? read('lib/pathao-availability-flags.ts') : '';
const availabilityHelper = exists('lib/pathao-area-availability.ts') ? read('lib/pathao-area-availability.ts') : '';
const pkg = JSON.parse(read('package.json'));

const addressFieldOrder = [
  'placeholder="Full name"',
  'placeholder="Phone number"',
  'Loading cities...',
  'Loading zones...',
  'Loading areas...',
  'placeholder="Street address"',
].map((needle) => checkout.indexOf(needle));
const addressFieldsInOrder = addressFieldOrder.every((index) => index >= 0)
  && addressFieldOrder.every((index, position, list) => position === 0 || index > list[position - 1]);

check('checkout keeps approved address fields in order', addressFieldsInOrder);
check('checkout uses simple Street address label only', checkout.includes('placeholder="Street address"') && !checkout.includes('House/Road/Flat/Building/Landmark'));
check('checkout tracks selected area availability', checkout.includes('selectedAreaHomeDeliveryAvailable') && checkout.includes('selectedArea?.homeDeliveryAvailable'));
check('checkout requires available Pathao area before delivery quote/order submit', checkout.includes('hasDeliveryLocation') && checkout.includes('selectedAreaHomeDeliveryAvailable'));
check('checkout disables unavailable Pathao area options', checkout.includes('disabled={!area.homeDeliveryAvailable}') && checkout.includes('(Unavailable)'));
check('checkout shows unavailable-area warning', checkout.includes('Home delivery is not available in this area'));
check('checkout submit blocks unavailable area', checkout.includes('Home delivery is not available in the selected area') && checkout.includes('setExpandedSection("address")'));
check('checkout sends city/zone/area/street separately', checkout.includes('city: shippingForm.city.trim()') && checkout.includes('zone: shippingForm.zone.trim()') && checkout.includes('area: shippingForm.area.trim()') && checkout.includes('streetAddress: shippingForm.streetAddress.trim()'));

check('availability flag normalizer handles string and numeric values', availabilityFlags.includes("['1', 'true', 'yes'") && availabilityFlags.includes("['0', 'false', 'no'"));
check('Pathao locations helper uses robust availability flags', pathaoLocations.includes('normalizePathaoAvailabilityFlag(source.home_delivery_available)'));
check('Pathao areas API uses robust availability flags', areasRoute.includes('normalizePathaoAvailabilityFlag(source.home_delivery_available)'));

check('server Pathao area availability helper exists', availabilityHelper.includes('verifyPathaoHomeDeliveryArea') && availabilityHelper.includes('PATHAO_HOME_DELIVERY_UNAVAILABLE'));
check('server verifies area belongs to selected zone', availabilityHelper.includes('PATHAO_AREA_ZONE_MISMATCH') && availabilityHelper.includes('candidate.id === pathaoAreaId'));
check('server rejects unavailable home-delivery area', availabilityHelper.includes('!area.homeDeliveryAvailable'));
check('order API validates new address Pathao area availability', orderRoute.includes('verifyPathaoHomeDeliveryArea({') && orderRoute.includes('pathaoZoneId: addressData.pathao_zone_id'));
check('order API validates saved address Pathao area availability', orderRoute.includes('pathaoZoneId: savedAccountingAddress.pathaoZoneId') && orderRoute.includes('pathaoAreaId: savedAccountingAddress.pathaoAreaId'));
check('order API returns typed Pathao availability errors', orderRoute.includes('PathaoAreaAvailabilityError') && orderRoute.includes('error instanceof PathaoAreaAvailabilityError'));
check('order validation still requires Full name, Phone, City, Zone, Area, Street address', orderValidation.includes('FULL_NAME_REQUIRED') && orderValidation.includes('INVALID_PHONE') && orderValidation.includes('DELIVERY_LOCATION_REQUIRED') && orderValidation.includes('STREET_ADDRESS_REQUIRED'));
check('saved address street validation message is simple', orderRoute.includes('Saved shipping address is missing street address.'));
check('package exposes phase5 audit script', pkg.scripts?.['qa:phase5-delivery-address'] === 'node scripts/phase5-delivery-address-pathao-availability-audit.mjs');

for (const item of checks) {
  console.log(`${item.ok ? '✅' : '❌'} ${item.label}`);
}

const failed = checks.filter((item) => !item.ok);
if (failed.length) {
  console.error(`\nPhase 5 delivery address + Pathao availability audit failed: ${failed.length}/${checks.length} checks failed.`);
  process.exit(1);
}

console.log(`\nPhase 5 delivery address + Pathao availability audit: ${checks.length}/${checks.length} checks passed.`);
