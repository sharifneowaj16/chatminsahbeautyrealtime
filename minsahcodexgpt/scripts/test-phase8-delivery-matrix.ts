import { selectCanonicalDeliveryMessage } from '../lib/delivery-message/resolver';
import { DEFAULT_DELIVERY_MESSAGE_CONFIG } from '../lib/delivery-message/types';
import type { DeliveryMessageConfig } from '../lib/delivery-message/types';

interface TestCase {
  name: string;
  isFreeDelivery: boolean;
  completedOrdersCount: number;
  config?: DeliveryMessageConfig;
  expectedType: 'PRODUCT_FREE' | 'NEW_CUSTOMER' | 'RETURNING_CUSTOMER' | null;
  expectedMessageNumber: 'Message 1' | 'Message 2' | 'Message 3' | 'Hidden / None';
  notes: string;
}

const defaultConfig = DEFAULT_DELIVERY_MESSAGE_CONFIG;

const testCases: TestCase[] = [
  {
    name: 'Free-delivery product + guest',
    isFreeDelivery: true,
    completedOrdersCount: 0,
    expectedType: 'PRODUCT_FREE',
    expectedMessageNumber: 'Message 1',
    notes: 'Priority 1 overrides guest status',
  },
  {
    name: 'Free-delivery product + member',
    isFreeDelivery: true,
    completedOrdersCount: 0,
    expectedType: 'PRODUCT_FREE',
    expectedMessageNumber: 'Message 1',
    notes: 'Priority 1 overrides authenticated member status',
  },
  {
    name: 'Free-delivery product + returning customer',
    isFreeDelivery: true,
    completedOrdersCount: 5,
    expectedType: 'PRODUCT_FREE',
    expectedMessageNumber: 'Message 1',
    notes: 'Priority 1 overrides returning customer status',
  },
  {
    name: 'Guest / no phone',
    isFreeDelivery: false,
    completedOrdersCount: 0,
    expectedType: 'NEW_CUSTOMER',
    expectedMessageNumber: 'Message 2',
    notes: 'Anonymous visitor receives new customer offer',
  },
  {
    name: 'Known phone + zero completed orders',
    isFreeDelivery: false,
    completedOrdersCount: 0,
    expectedType: 'NEW_CUSTOMER',
    expectedMessageNumber: 'Message 2',
    notes: 'Zero DELIVERED orders receives new customer offer',
  },
  {
    name: 'Known phone + one delivered order',
    isFreeDelivery: false,
    completedOrdersCount: 1,
    expectedType: 'RETURNING_CUSTOMER',
    expectedMessageNumber: 'Message 3',
    notes: '>=1 DELIVERED order qualifies for returning customer perk',
  },
  {
    name: 'Known phone + multiple delivered orders',
    isFreeDelivery: false,
    completedOrdersCount: 4,
    expectedType: 'RETURNING_CUSTOMER',
    expectedMessageNumber: 'Message 3',
    notes: 'Multiple DELIVERED orders qualify for returning customer perk',
  },
  {
    name: 'Cancelled orders only',
    isFreeDelivery: false,
    completedOrdersCount: 0, // Cancelled orders do not match OrderStatus.DELIVERED
    expectedType: 'NEW_CUSTOMER',
    expectedMessageNumber: 'Message 2',
    notes: 'OrderStatus.CANCELLED excluded by DB filter -> 0 delivered count',
  },
  {
    name: 'Returned orders only',
    isFreeDelivery: false,
    completedOrdersCount: 0, // Returned/refunded orders do not match OrderStatus.DELIVERED
    expectedType: 'NEW_CUSTOMER',
    expectedMessageNumber: 'Message 2',
    notes: 'OrderStatus.RETURNED excluded by DB filter -> 0 delivered count',
  },
  {
    name: 'Shipped but not completed, if applicable',
    isFreeDelivery: false,
    completedOrdersCount: 0, // SHIPPED / PROCESSING do not match OrderStatus.DELIVERED
    expectedType: 'NEW_CUSTOMER',
    expectedMessageNumber: 'Message 2',
    notes: 'In-flight orders (SHIPPED/PROCESSING) excluded until DELIVERED',
  },
  {
    name: 'Message 1 inactive on free-delivery product',
    isFreeDelivery: true,
    completedOrdersCount: 1,
    config: {
      ...defaultConfig,
      message1: { ...defaultConfig.message1, active: false },
    },
    expectedType: 'RETURNING_CUSTOMER',
    expectedMessageNumber: 'Message 3',
    notes: 'Falls back to next eligible active tier (Returning Customer)',
  },
  {
    name: 'Message 3 inactive for returning customer',
    isFreeDelivery: false,
    completedOrdersCount: 2,
    config: {
      ...defaultConfig,
      message3: { ...defaultConfig.message3, active: false },
    },
    expectedType: 'NEW_CUSTOMER',
    expectedMessageNumber: 'Message 2',
    notes: 'Falls back to Message 2 (New Customer) when Message 2 is active',
  },
  {
    name: 'All messages inactive',
    isFreeDelivery: false,
    completedOrdersCount: 0,
    config: {
      ...defaultConfig,
      message1: { ...defaultConfig.message1, active: false },
      message2: { ...defaultConfig.message2, active: false },
      message3: { ...defaultConfig.message3, active: false },
    },
    expectedType: null,
    expectedMessageNumber: 'Hidden / None',
    notes: 'Returns null / banner hidden when all messages are inactive',
  },
];

console.log('='.repeat(80));
console.log('RUNNING DELIVERY MESSAGE VERIFICATION TEST MATRIX');
console.log('='.repeat(80));

let passCount = 0;
let failCount = 0;

for (const tc of testCases) {
  const result = selectCanonicalDeliveryMessage({
    isFreeDelivery: tc.isFreeDelivery,
    completedOrdersCount: tc.completedOrdersCount,
    config: tc.config || defaultConfig,
  });

  const actualType = result?.messageType || null;
  const isPass = actualType === tc.expectedType;

  if (isPass) {
    passCount++;
    console.log(`[PASS] ${tc.name.padEnd(45)} -> Got: ${String(actualType).padEnd(20)} | Expected: ${tc.expectedMessageNumber}`);
  } else {
    failCount++;
    console.error(`[FAIL] ${tc.name.padEnd(45)} -> Got: ${String(actualType)} | Expected: ${String(tc.expectedType)}`);
  }
}

console.log('='.repeat(80));
console.log(`SUMMARY: ${passCount} PASSED, ${failCount} FAILED out of ${testCases.length} tests.`);
console.log('='.repeat(80));

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
