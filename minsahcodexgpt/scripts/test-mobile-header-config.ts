import assert from 'node:assert/strict';
import { DEFAULT_MOBILE_HEADER_CONFIG } from '../types/navigation-config';
import { normalizeMobileNavConfig } from '../lib/navigation/config-service';

// Test 1: DEFAULT_MOBILE_HEADER_CONFIG contains showAccount === false
assert.equal(
  DEFAULT_MOBILE_HEADER_CONFIG.showAccount,
  false,
  'Default showAccount must be false'
);

// Test 2: normalizeMobileNavConfig extracts showAccount properly
const normalizedDefault = normalizeMobileNavConfig({});
assert.ok(normalizedDefault.mobileHeader, 'mobileHeader must exist on normalizedDefault');
assert.equal(
  normalizedDefault.mobileHeader.showAccount,
  false,
  'Normalized config without mobileHeader defaults showAccount to false'
);

const normalizedCustom = normalizeMobileNavConfig({
  mobileHeader: {
    showLogo: true,
    showDeliverTo: false,
    showWishlist: true,
    showCart: true,
    showAccount: true,
    showMenu: false,
  },
});
assert.ok(normalizedCustom.mobileHeader, 'mobileHeader must exist on normalizedCustom');
assert.equal(
  normalizedCustom.mobileHeader.showAccount,
  true,
  'Normalized config preserves custom showAccount: true'
);

// Test 3: All action icons OFF calculation logic
function isAllMobileIconsOff(cfg: {
  showWishlist?: boolean;
  showCart?: boolean;
  showAccount?: boolean;
  showMenu?: boolean;
}) {
  return (
    !cfg.showWishlist &&
    !cfg.showCart &&
    !cfg.showAccount &&
    !cfg.showMenu
  );
}

// Default state: cart and menu are ON -> should be false
assert.equal(
  isAllMobileIconsOff(DEFAULT_MOBILE_HEADER_CONFIG),
  false,
  'Default icons include cart and menu, so allMobileIconsOff is false'
);

// When wishlist=false, cart=false, account=false, menu=false -> should be true
const allOffConfig = {
  showLogo: true,
  showDeliverTo: true,
  showWishlist: false,
  showCart: false,
  showAccount: false,
  showMenu: false,
};
assert.equal(
  isAllMobileIconsOff(allOffConfig),
  true,
  'When all 4 action icons are off, allMobileIconsOff must be true'
);

// When any single icon is toggled back ON -> should be false
assert.equal(
  isAllMobileIconsOff({ ...allOffConfig, showAccount: true }),
  false,
  'When account is ON, allMobileIconsOff must be false'
);
assert.equal(
  isAllMobileIconsOff({ ...allOffConfig, showCart: true }),
  false,
  'When cart is ON, allMobileIconsOff must be false'
);
assert.equal(
  isAllMobileIconsOff({ ...allOffConfig, showWishlist: true }),
  false,
  'When wishlist is ON, allMobileIconsOff must be false'
);
assert.equal(
  isAllMobileIconsOff({ ...allOffConfig, showMenu: true }),
  false,
  'When menu is ON, allMobileIconsOff must be false'
);

console.log('✅ ALL MOBILE HEADER CONFIG & LAYOUT TESTS PASSED!');

