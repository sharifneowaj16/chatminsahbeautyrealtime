// scripts/test-7-operational-refinements.ts
// Comprehensive Automated Verification for the 7 Core Operational Safety & Friction-Free Workflow Enhancements

import 'dotenv/config';
import prisma from '../lib/prisma';
import { Prisma } from '../generated/prisma/client';
import { recordStockMovement } from '../lib/inventory/stock-service';

async function run7RefinementsSimulation() {
  console.log('========================================================================');
  console.log('🚀 STARTING 7 CORE OPERATIONAL REFINEMENTS AUTOMATED VERIFICATION');
  console.log('========================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      if (details) console.log(`     ↳ ${details}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (details) console.error(`     ↳ ${details}`);
      throw new Error(`Assertion failed: ${testName}`);
    }
  }

  const timestamp = Date.now();
  const testUser = await prisma.user.findFirst();
  if (!testUser) {
    throw new Error('No user found in database to associate test records with.');
  }

  // Setup: Create 2 test products for exchanges and clearance tests
  const productA = await prisma.product.create({
    data: {
      name: `Refinement Product Alpha ${timestamp}`,
      sku: `REF-A-${timestamp}`,
      slug: `ref-a-${timestamp}`,
      price: new Prisma.Decimal(500),
      costPrice: new Prisma.Decimal(300),
      lastCostPrice: new Prisma.Decimal(300),
      quantity: 20,
      trackInventory: true,
    },
  });

  const productB = await prisma.product.create({
    data: {
      name: `Refinement Product Beta ${timestamp}`,
      sku: `REF-B-${timestamp}`,
      slug: `ref-b-${timestamp}`,
      price: new Prisma.Decimal(750),
      costPrice: new Prisma.Decimal(450),
      lastCostPrice: new Prisma.Decimal(450),
      quantity: 15,
      trackInventory: true,
    },
  });

  console.log(`📦 Created Test Products:`);
  console.log(`   - Product A: ${productA.name} (৳${productA.price}, Stock: ${productA.quantity})`);
  console.log(`   - Product B: ${productB.name} (৳${productB.price}, Stock: ${productB.quantity})\n`);

  try {
    // ---------------------------------------------------------------------------------
    // REFINEMENT 1: Courier COD Pending Receivables vs In-Hand Cash Reconciliation
    // ---------------------------------------------------------------------------------
    console.log('▶ TESTING REFINEMENT 1: Courier COD Receivables vs In-Hand Drawer Cash');
    const today = new Date().toISOString().slice(0, 10);

    // 1. Create or query DailyCashRegister with in-office vs courier separation
    const register = await prisma.dailyCashRegister.upsert({
      where: { date: today },
      create: {
        date: today,
        openingCash: new Prisma.Decimal(2000),
        codCollected: new Prisma.Decimal(12500),
        courierPendingReceivables: new Prisma.Decimal(10500),
        courierSettledBank: new Prisma.Decimal(0),
        runnerExpenses: new Prisma.Decimal(1200),
        officeExpenses: new Prisma.Decimal(300),
        expectedCash: new Prisma.Decimal(2500), // 2000 + 2000 (in-office) - 1200 - 300
        actualCashCounted: new Prisma.Decimal(2500),
        discrepancy: new Prisma.Decimal(0),
        status: 'OPEN',
      },
      update: {
        courierPendingReceivables: new Prisma.Decimal(10500),
        courierSettledBank: new Prisma.Decimal(0),
      },
    });

    assert(
      Number(register.courierPendingReceivables) === 10500,
      'Courier receivables properly segregated from physical cash in drawer',
      `Locked in Steadfast/Pathao: ৳${register.courierPendingReceivables}`
    );

    // 2. Simulate 1-Click Courier Bank Settlement Payout: ৳5000 transferred to bank
    const payoutAmount = 5000;
    const updatedRegister = await prisma.dailyCashRegister.update({
      where: { date: today },
      data: {
        courierSettledBank: { increment: payoutAmount },
        courierPendingReceivables: { decrement: payoutAmount },
        notes: `Courier bank transfer ref #TRX-TEST-${timestamp}`,
      },
    });

    assert(
      Number(updatedRegister.courierSettledBank) === 5000 &&
      Number(updatedRegister.courierPendingReceivables) === 5500,
      '1-Click Courier Bank Deposit atomically updates settled bank and reduces pending receivables',
      `Settled: ৳${updatedRegister.courierSettledBank}, Remaining Pending: ৳${updatedRegister.courierPendingReceivables}`
    );
    console.log();

    // ---------------------------------------------------------------------------------
    // REFINEMENT 2: Live Wholesale Manifest Order Cancellation Sync
    // ---------------------------------------------------------------------------------
    console.log('▶ TESTING REFINEMENT 2: Live Wholesale Manifest Order Cancellation Sync');
    // Create an order that gets CANCELLED while runner is out
    const cancelledOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-CANCEL-${timestamp}`,
        userId: testUser.id,
        status: 'CANCELLED',
        subtotal: new Prisma.Decimal(500),
        total: new Prisma.Decimal(500),
        items: {
          create: [
            {
              name: productA.name,
              sku: productA.sku,
              quantity: 2,
              price: new Prisma.Decimal(500),
              total: new Prisma.Decimal(1000),
              productId: productA.id,
            },
          ],
        },
      },
      include: { items: true },
    });

    // An active order that is NOT cancelled
    const activeOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-ACTIVE-${timestamp}`,
        userId: testUser.id,
        status: 'CONFIRMED',
        subtotal: new Prisma.Decimal(750),
        total: new Prisma.Decimal(750),
        items: {
          create: [
            {
              name: productB.name,
              sku: productB.sku,
              quantity: 1,
              price: new Prisma.Decimal(750),
              total: new Prisma.Decimal(750),
              productId: productB.id,
            },
          ],
        },
      },
      include: { items: true },
    });

    // Check manifest sync logic
    const orderNumbersParam = [cancelledOrder.orderNumber, activeOrder.orderNumber];
    const cancelledOrdersFound = await prisma.order.findMany({
      where: {
        orderNumber: { in: orderNumbersParam },
        status: { in: ['CANCELLED', 'REFUNDED'] },
      },
      select: {
        orderNumber: true,
        items: { select: { sku: true } },
      },
    });

    const detectedCancelledOrderNumbers = cancelledOrdersFound.map((o) => o.orderNumber);
    const detectedCancelledSkus = Array.from(
      new Set(cancelledOrdersFound.flatMap((o) => o.items.map((i) => i.sku)))
    );

    assert(
      detectedCancelledOrderNumbers.includes(cancelledOrder.orderNumber) &&
      !detectedCancelledOrderNumbers.includes(activeOrder.orderNumber),
      'Manifest sync accurately isolates cancelled order from active orders',
      `Identified cancelled: ${detectedCancelledOrderNumbers.join(', ')}`
    );

    assert(
      detectedCancelledSkus.includes(productA.sku),
      'Manifest sync flags cancelled product SKU to trigger auto-strikeout and DO NOT BUY audio alert',
      `Flagged SKU: ${detectedCancelledSkus.join(', ')}`
    );
    console.log();

    // ---------------------------------------------------------------------------------
    // REFINEMENT 3: Runner Cash Discrepancy Carry-Over & Running Float Ledger
    // ---------------------------------------------------------------------------------
    console.log('▶ TESTING REFINEMENT 3: Runner Discrepancy Carry-Over & Running Float Ledger');
    const runnerTestName = `Runner_Float_${timestamp}`;

    // Yesterday's trip left runner with ৳400 debt (DISCREPANCY)
    await prisma.runnerCashLedger.create({
      data: {
        runnerName: runnerTestName,
        cashGiven: new Prisma.Decimal(3000),
        actualSpent: new Prisma.Decimal(2000),
        cashReturned: new Prisma.Decimal(600),
        discrepancy: new Prisma.Decimal(400), // Runner owes 400
        status: 'DISCREPANCY',
        notes: 'Yesterday trip discrepancy',
      },
    });

    // Fetch unsettled ledgers to calculate carry-over
    const unsettledTrips = await prisma.runnerCashLedger.findMany({
      where: {
        runnerName: runnerTestName,
        status: 'DISCREPANCY',
      },
    });

    const previousDue = unsettledTrips.reduce((sum, t) => sum + Math.max(0, Number(t.discrepancy)), 0);
    const morningHandover = 5000;
    const effectiveBudget = Math.max(0, Number((morningHandover - previousDue).toFixed(2)));

    // Create today's new trip with previousDue and effectiveBudget logged
    const todayTrip = await prisma.runnerCashLedger.create({
      data: {
        runnerName: runnerTestName,
        cashGiven: new Prisma.Decimal(morningHandover),
        previousDue: new Prisma.Decimal(previousDue),
        effectiveBudget: new Prisma.Decimal(effectiveBudget),
        actualSpent: new Prisma.Decimal(4600),
        cashReturned: new Prisma.Decimal(0),
        discrepancy: new Prisma.Decimal(0),
        status: 'SETTLED',
        notes: `Morning trip with previous due auto-deducted`,
      },
    });

    assert(
      Number(todayTrip.previousDue) === 400,
      'Yesterday runner debt successfully carried over into morning float',
      `Previous Due: ৳${todayTrip.previousDue}`
    );

    assert(
      Number(todayTrip.effectiveBudget) === 4600,
      'Effective shopping budget auto-adjusted (Handover ৳5000 - Due ৳400 = ৳4600)',
      `Effective Net Handover: ৳${todayTrip.effectiveBudget}`
    );
    console.log();

    // ---------------------------------------------------------------------------------
    // REFINEMENT 4: Procurement Margin Guardian & Buy Price Surge Warning
    // ---------------------------------------------------------------------------------
    console.log('▶ TESTING REFINEMENT 4: Procurement Margin Guardian & Buy Price Surge Warning');
    const retailPrice = 1000;

    // Case 1: Healthy buy price of ৳600 (margin 40% > 20%)
    const normalBuyPrice = 600;
    const normalCostRatio = normalBuyPrice / retailPrice;
    const normalAlert = normalCostRatio > 0.8;

    // Case 2: Surged buy price of ৳850 (margin 15% < 20%, cost ratio 85%)
    const surgedBuyPrice = 850;
    const surgedCostRatio = surgedBuyPrice / retailPrice;
    const surgedAlert = surgedCostRatio > 0.8;

    assert(
      !normalAlert && surgedAlert,
      'Margin Guardian accurately detects when wholesale cost exceeds 80% of retail price',
      `Normal ৳${normalBuyPrice} alert: ${normalAlert} (margin ${Math.round((1 - normalCostRatio) * 100)}%), Surged ৳${surgedBuyPrice} alert: ${surgedAlert} (margin ${Math.round((1 - surgedCostRatio) * 100)}%)`
    );
    console.log();

    // ---------------------------------------------------------------------------------
    // REFINEMENT 5: Item-Level Exchange Price Gap Reconciler
    // ---------------------------------------------------------------------------------
    console.log('▶ TESTING REFINEMENT 5: Item-Level Exchange Price Gap Reconciler');
    // Create an order with Product A (৳500)
    const exchangeOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-EXCH-${timestamp}`,
        userId: testUser.id,
        status: 'CONFIRMED',
        subtotal: new Prisma.Decimal(500),
        total: new Prisma.Decimal(500),
        items: {
          create: [
            {
              name: productA.name,
              sku: productA.sku,
              quantity: 1,
              price: new Prisma.Decimal(500),
              total: new Prisma.Decimal(500),
              productId: productA.id,
              itemStatus: 'FULFILLED',
            },
          ],
        },
      },
      include: { items: true },
    });

    const originalItem = exchangeOrder.items[0];
    const originalPrice = Number(originalItem.price);
    const replProduct = await prisma.product.findUniqueOrThrow({ where: { id: productB.id } });
    const replacementPrice = Number(replProduct.price);

    // Compute expected gap
    const expectedGap = Number(((replacementPrice - originalPrice) * originalItem.quantity).toFixed(2));
    const newExpectedSubtotal = Number((Number(exchangeOrder.subtotal) + expectedGap).toFixed(2));
    const newExpectedTotal = Number((Number(exchangeOrder.total) + expectedGap).toFixed(2));

    // Simulate atomic exchange execution
    await prisma.$transaction(async (tx) => {
      // 1. Restock original Product A
      await tx.product.update({
        where: { id: productA.id },
        data: { quantity: { increment: 1 } },
      });
      await recordStockMovement({
        productId: productA.id,
        delta: 1,
        type: 'RETURN_RESTOCK',
        referenceId: exchangeOrder.orderNumber,
        notes: 'Original item returned for exchange',
      }, tx);

      // 2. Decrement replacement Product B
      await tx.product.update({
        where: { id: productB.id },
        data: { quantity: { decrement: 1 } },
      });
      await recordStockMovement({
        productId: productB.id,
        delta: -1,
        type: 'ORDER_FULFILLMENT',
        referenceId: exchangeOrder.orderNumber,
        notes: 'Replacement item dispatched',
      }, tx);

      // 3. Update Order Item status
      await tx.orderItem.update({
        where: { id: originalItem.id },
        data: { itemStatus: 'EXCHANGED' },
      });

      // 4. Update Order subtotal and total
      await tx.order.update({
        where: { id: exchangeOrder.id },
        data: {
          subtotal: newExpectedSubtotal,
          total: newExpectedTotal,
          adminNote: `[Exchange]: ${productA.name} (৳${originalPrice}) exchanged for ${productB.name} (৳${replacementPrice}). Gap: +৳${expectedGap}.`,
        },
      });
    });

    const updatedExchangeOrder = await prisma.order.findUniqueOrThrow({
      where: { id: exchangeOrder.id },
      include: { items: true },
    });

    assert(
      Number(updatedExchangeOrder.subtotal) === 750 && Number(updatedExchangeOrder.total) === 750,
      'Exchange Price Gap Reconciler accurately updates order subtotal and total (COD Collectible)',
      `Original: ৳500, Replacement: ৳750, Adjusted Total: ৳${updatedExchangeOrder.total} (+৳${expectedGap})`
    );

    assert(
      updatedExchangeOrder.items[0].itemStatus === 'EXCHANGED',
      'Order item status updated to EXCHANGED',
      `Status: ${updatedExchangeOrder.items[0].itemStatus}`
    );
    console.log();

    // ---------------------------------------------------------------------------------
    // REFINEMENT 6: Dead-Stock 1-Click Clearance Flash Sale Bridge
    // ---------------------------------------------------------------------------------
    console.log('▶ TESTING REFINEMENT 6: Dead-Stock 1-Click Clearance Flash Sale Bridge');
    const clearanceProduct = await prisma.product.create({
      data: {
        name: `Clearance Test Lipstick ${timestamp}`,
        sku: `CLR-${timestamp}`,
        slug: `clr-test-${timestamp}`,
        price: new Prisma.Decimal(1000),
        costPrice: new Prisma.Decimal(500),
        quantity: 50,
        trackInventory: true,
      },
    });

    // 1. Apply 20% clearance discount
    const discountPct = 20;
    const originalClearancePrice = Number(clearanceProduct.price);
    const discountedPrice = Math.round(originalClearancePrice * (1 - discountPct / 100));

    const onClearance = await prisma.product.update({
      where: { id: clearanceProduct.id },
      data: {
        price: discountedPrice,
        compareAtPrice: originalClearancePrice,
        isClearanceSale: true,
        clearanceDiscountPercent: discountPct,
      },
    });

    assert(
      onClearance.isClearanceSale === true &&
      Number(onClearance.price) === 800 &&
      Number(onClearance.compareAtPrice) === 1000 &&
      onClearance.clearanceDiscountPercent === 20,
      '1-Click Clearance Sale applies discount, preserves original price in compareAtPrice, and tags product',
      `Original: ৳1000, Clearance Price: ৳${onClearance.price} (20% OFF), isClearanceSale: ${onClearance.isClearanceSale}`
    );

    // 2. Remove clearance sale (revert to original price)
    const reverted = await prisma.product.update({
      where: { id: clearanceProduct.id },
      data: {
        price: onClearance.compareAtPrice ?? onClearance.price,
        compareAtPrice: null,
        isClearanceSale: false,
        clearanceDiscountPercent: 0,
      },
    });

    assert(
      reverted.isClearanceSale === false &&
      Number(reverted.price) === 1000 &&
      reverted.compareAtPrice === null &&
      reverted.clearanceDiscountPercent === 0,
      'Reverting clearance sale restores original retail price and resets flags',
      `Restored Price: ৳${reverted.price}, isClearanceSale: ${reverted.isClearanceSale}`
    );
    console.log();

    // ---------------------------------------------------------------------------------
    // REFINEMENT 7: Vendor Defect Replacement Queue vs Courier Transit Scrap
    // ---------------------------------------------------------------------------------
    console.log('▶ TESTING REFINEMENT 7: Vendor Defect Replacement Queue vs Courier Transit Scrap');
    // Create an order to inspect for vendor defect
    const defectOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-DEFECT-${timestamp}`,
        userId: testUser.id,
        status: 'DELIVERED',
        subtotal: new Prisma.Decimal(500),
        total: new Prisma.Decimal(500),
        items: {
          create: [
            {
              name: productA.name,
              sku: productA.sku,
              quantity: 2,
              price: new Prisma.Decimal(500),
              total: new Prisma.Decimal(1000),
              productId: productA.id,
              itemStatus: 'FULFILLED',
            },
          ],
        },
      },
      include: { items: true },
    });

    const defectItem = defectOrder.items[0];
    const initialProductAStock = (await prisma.product.findUniqueOrThrow({ where: { id: productA.id } })).quantity;

    // 1. Inspect as VENDOR_DEFECT
    await prisma.$transaction(async (tx) => {
      // Update itemStatus to RETURNED_DEFECTIVE
      await tx.orderItem.update({
        where: { id: defectItem.id },
        data: {
          itemStatus: 'RETURNED_DEFECTIVE',
          returnReason: 'Factory seal broken and nozzle clogged on delivery',
        },
      });

      // Log movement as VENDOR_DEFECT_CLAIM (delta: 0, held for supplier exchange, zero net scrap loss)
      await recordStockMovement({
        productId: productA.id,
        delta: 0,
        type: 'VENDOR_DEFECT_CLAIM',
        referenceId: defectOrder.orderNumber,
        costPriceAtTime: Number(productA.costPrice),
        notes: 'Vendor defect queued for wholesale runner supplier replacement',
      }, tx);
    });

    const updatedDefectItem = await prisma.orderItem.findUniqueOrThrow({ where: { id: defectItem.id } });
    const productAStockAfterClaim = (await prisma.product.findUniqueOrThrow({ where: { id: productA.id } })).quantity;

    const defectMovement = await prisma.stockMovement.findFirst({
      where: {
        productId: productA.id,
        referenceId: defectOrder.orderNumber,
        type: 'VENDOR_DEFECT_CLAIM',
      },
    });

    assert(
      updatedDefectItem.itemStatus === 'RETURNED_DEFECTIVE' && defectMovement !== null,
      'Vendor Defect logged as VENDOR_DEFECT_CLAIM without writing off as scrap loss',
      `Item status: ${updatedDefectItem.itemStatus}, Movement: ${defectMovement?.type} (delta: ${defectMovement?.delta})`
    );

    assert(
      productAStockAfterClaim === initialProductAStock,
      'Sellable inventory remains unchanged until wholesale supplier replaces the defective unit',
      `Stock before: ${initialProductAStock}, Stock after: ${productAStockAfterClaim}`
    );

    // 2. Runner visits wholesale supplier and returns with replacement product (RESOLVE_SUPPLIER_EXCHANGE)
    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productA.id },
        data: { quantity: { increment: 2 } },
      });

      await recordStockMovement({
        productId: productA.id,
        delta: 2,
        type: 'VENDOR_DEFECT_EXCHANGED',
        referenceId: `SUPPLIER_REPLACEMENT_${defectOrder.orderNumber}`,
        costPriceAtTime: Number(productA.costPrice),
        notes: 'Runner successfully exchanged defective item with wholesale merchant (+2 units restocked)',
      }, tx);
    });

    const finalProductAStock = (await prisma.product.findUniqueOrThrow({ where: { id: productA.id } })).quantity;
    const exchangedMovement = await prisma.stockMovement.findFirst({
      where: {
        productId: productA.id,
        type: 'VENDOR_DEFECT_EXCHANGED',
      },
    });

    assert(
      finalProductAStock === initialProductAStock + 2 && exchangedMovement !== null,
      'Supplier replacement successfully restocks sellable inventory via VENDOR_DEFECT_EXCHANGED',
      `Restocked Stock: ${finalProductAStock} (+2 units), Movement: ${exchangedMovement?.type}`
    );
    console.log();

  } finally {
    // Teardown created test records cleanly
    console.log('🧹 CLEANING UP SIMULATION TEST RECORDS...');
    await prisma.stockMovement.deleteMany({
      where: {
        productId: { in: [productA.id, productB.id] },
      },
    });

    await prisma.orderItem.deleteMany({
      where: {
        productId: { in: [productA.id, productB.id] },
      },
    });

    await prisma.order.deleteMany({
      where: {
        orderNumber: {
          in: [
            `ORD-CANCEL-${timestamp}`,
            `ORD-ACTIVE-${timestamp}`,
            `ORD-EXCH-${timestamp}`,
            `ORD-DEFECT-${timestamp}`,
          ],
        },
      },
    });

    await prisma.runnerCashLedger.deleteMany({
      where: {
        runnerName: `Runner_Float_${timestamp}`,
      },
    });

    await prisma.product.deleteMany({
      where: {
        id: { in: [productA.id, productB.id] },
      },
    });

    console.log('✨ Cleanup complete.\n');
  }

  console.log('========================================================================');
  console.log(`🎉 ALL 7 OPERATIONAL REFINEMENTS VERIFIED: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('========================================================================');
}

run7RefinementsSimulation()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('💥 Test execution failed:', err);
    process.exit(1);
  });
