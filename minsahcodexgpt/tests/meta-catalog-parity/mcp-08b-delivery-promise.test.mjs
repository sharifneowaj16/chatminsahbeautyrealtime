import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveDeliveryPromise } from '../../lib/commerce/delivery-promise.ts';

test('MCP-08B: Dhaka / Fast Zone before 3:00 PM yields 1-day same-day dispatch', () => {
  // 11:00 AM UTC+6 (5:00 AM UTC)
  const morningDate = new Date('2026-10-03T05:00:00Z');

  for (const area of ['Dhaka', 'Keraniganj', 'Narayanganj', 'Savar', 'dhaka north']) {
    const promise = resolveDeliveryPromise({ area, now: morningDate });
    assert.equal(promise.isFastZone, true);
    assert.equal(promise.isBeforeCutoff, true);
    assert.equal(promise.estimatedDays, 1);
    assert.equal(promise.sameDayDispatch, true);
    assert.ok(promise.primaryNote.en.includes('1-day delivery (Dispatched today)'));
    assert.ok(promise.primaryNote.bn.includes('১ দিনে ডেলিভারি (আজই ডিসপ্যাচ)'));
    assert.equal(promise.fridayNote.en, 'Friday delivery available');
  }
});

test('MCP-08B: Dhaka / Fast Zone after 3:00 PM yields 2-day next-day dispatch', () => {
  // 4:30 PM UTC+6 (10:30 AM UTC)
  const eveningDate = new Date('2026-10-03T10:30:00Z');

  const promise = resolveDeliveryPromise({ area: 'Dhaka', now: eveningDate });
  assert.equal(promise.isFastZone, true);
  assert.equal(promise.isBeforeCutoff, false);
  assert.equal(promise.estimatedDays, 2);
  assert.equal(promise.sameDayDispatch, false);
  assert.ok(promise.primaryNote.en.includes('2-day delivery (Dispatched tomorrow)'));
  assert.ok(promise.primaryNote.bn.includes('২ দিনে ডেলিভারি (আগামীকাল ডিসপ্যাচ)'));
});

test('MCP-08B: Outside Dhaka yields 2-day (48 hrs) delivery', () => {
  const date = new Date('2026-10-03T05:00:00Z');

  for (const area of ['Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Coxs Bazar']) {
    const promise = resolveDeliveryPromise({ area, now: date });
    assert.equal(promise.isFastZone, false);
    assert.equal(promise.estimatedDays, 2);
    assert.ok(promise.primaryNote.en.includes('2-day (48 hrs) delivery'));
    assert.ok(promise.primaryNote.bn.includes('২ দিনে (৪৮ ঘণ্টায়) নিশ্চিত ডেলিভারি'));
  }
});

test('MCP-08B: No area defaults to comprehensive fast-zone and outside-Dhaka promises', () => {
  const morningDate = new Date('2026-10-03T05:00:00Z');
  const promise = resolveDeliveryPromise({ now: morningDate });

  assert.ok(promise.primaryNote.en.includes('1-day delivery'));
  assert.ok(promise.outsideDhakaNote.en.includes('2-day (48 hrs) delivery'));
  assert.equal(promise.fridayNote.en, 'Friday delivery available');
});
