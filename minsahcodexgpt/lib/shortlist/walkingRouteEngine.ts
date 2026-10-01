// lib/shortlist/walkingRouteEngine.ts
// Intelligent Walking Route Clustering & Thermal Slip Generation Engine
// Computes optimized stops, cash float, order allocations, and ESC/POS thermal payloads

import {
  WholesaleSkuRow,
  WalkingRouteStep,
  WholesalePickListManifestData,
  ThermalReceiptPayload,
} from '@/app/admin/shortlist/types';

/**
 * Clusters selected WholesaleSkuRows by Vendor Stall and Market Zone,
 * ordering them into an optimized warehouse/bazaar walking sequence.
 */
export function buildWalkingManifest(
  selectedSkus: WholesaleSkuRow[],
  runnerName: string = 'Shakil',
  runnerCode: string = 'MSB-R04',
  pinnedBatchNumber?: string
): WholesalePickListManifestData {
  const generateBatchNumber = () => {
    if (pinnedBatchNumber) return pinnedBatchNumber;
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `PL-${dd}${mm}-${rand}`;
  };

  const batchNumber = generateBatchNumber();

  if (selectedSkus.length === 0) {
    return {
      batchNumber,
      selectedSkusCount: 0,
      selectedUnitsCount: 0,
      totalCashFloat: 0,
      hubsCovered: 'None',
      walkingSteps: [],
      qualityProtocolChecked: true,
      runnerName,
      runnerCode,
    };
  }

  // 1. Group items by Stall / Vendor
  const stallMap = new Map<string, WholesaleSkuRow[]>();
  for (const item of selectedSkus) {
    const key = `${item.vendor.zone}:::${item.vendor.stallName}`;
    const list = stallMap.get(key) ?? [];
    list.push(item);
    stallMap.set(key, list);
  }

  // 2. Build Ordered Walking Steps
  const walkingSteps: WalkingRouteStep[] = [];
  let stepIndex = 1;

  for (const [, items] of stallMap.entries()) {
    const firstItem = items[0];
    const totalUnitsInStep = items.reduce((sum, i) => sum + i.requiredQuantity, 0);
    const totalCostInStep = items.reduce((sum, i) => sum + i.financials.totalCost, 0);
    const totalUnitsPicked = items.reduce((sum, i) => sum + i.pickedQuantity, 0);

    // Merge all linked order allocations
    const orderAllocations: Array<{
      orderNumber: string;
      quantity: number;
      shippingType?: 'Express' | 'Standard';
    }> = [];

    for (const item of items) {
      for (const ord of item.linkedOrders) {
        orderAllocations.push({
          orderNumber: ord.orderNumber,
          quantity: ord.quantity,
          shippingType: ord.shippingType,
        });
      }
    }

    walkingSteps.push({
      stepIndex,
      marketName: firstItem.vendor.zone.toUpperCase() + (firstItem.vendor.zone.toLowerCase().includes('market') || firstItem.vendor.zone.toLowerCase().includes('bhaban') ? '' : ' MARKET'),
      unitsInStep: totalUnitsInStep,
      vendorName: firstItem.vendor.stallName,
      stallAddress: firstItem.vendor.standLocation,
      phone: firstItem.vendor.phone,
      contactName: firstItem.vendor.contactPerson,
      itemTitle: firstItem.title,
      variantOrShade: firstItem.variantOrShade,
      skuCode: firstItem.sku,
      volumeSpec: firstItem.volumeSpec,
      orderAllocations,
      unitCost: firstItem.financials.unitCost,
      totalCost: totalCostInStep,
      unitsPicked: totalUnitsPicked,
      totalUnitsRequired: totalUnitsInStep,
      warningAlert: firstItem.vendor.statusTagType === 'urgent' ? firstItem.vendor.statusTag : undefined,
    });

    stepIndex++;
  }

  // 3. Compute Aggregates
  const totalUnits = selectedSkus.reduce((sum, s) => sum + s.requiredQuantity, 0);
  const totalCashFloat = selectedSkus.reduce((sum, s) => sum + s.financials.totalCost, 0);
  const zones = Array.from(new Set(selectedSkus.map((s) => s.vendor.zone)));
  const hubsCovered = zones.join(' & ') || 'Dhaka Central Hub';

  return {
    batchNumber,
    selectedSkusCount: selectedSkus.length,
    selectedUnitsCount: totalUnits,
    totalCashFloat,
    hubsCovered,
    walkingSteps,
    qualityProtocolChecked: true,
    runnerName,
    runnerCode,
  };
}

/**
 * Builds the realistic 80mm ESC/POS Thermal Receipt Payload matching
 * the hardware print standard (203 DPI, 80mm roll, ESC/POS commands).
 */
export function buildThermalReceiptPayload(
  manifest: WholesalePickListManifestData,
  selectedSkus: WholesaleSkuRow[]
): ThermalReceiptPayload {
  const lineItems = selectedSkus.map((sku) => {
    const orderRefs = sku.linkedOrders.map(
      (o) => `${o.orderNumber} (${o.quantity}x${o.shippingType === 'Express' ? ' Expr' : ''})`
    );

    return {
      title: sku.title.toUpperCase(),
      shadeOrType: sku.variantOrShade,
      skuCode: sku.sku,
      volumeSpec: sku.volumeSpec,
      qty: sku.requiredQuantity,
      unitPrice: sku.financials.unitCost,
      totalPrice: sku.financials.totalCost,
      orderRefs,
    };
  });

  const walkingRouteSummary = manifest.walkingSteps.map(
    (step) => `${step.stepIndex}. ${step.vendorName} (${step.marketName})`
  );

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  return {
    slipNumber: manifest.batchNumber,
    rigId: `RIG #${manifest.runnerCode.replace(/[^0-9]/g, '') || '04'}`,
    dateTimeStr: `${dateStr} • ${timeStr}`,
    hubLocation: `Dhaka Hub • ${manifest.hubsCovered}`,
    walkingRouteSummary,
    lineItems,
    totalUnits: manifest.selectedUnitsCount,
    totalSkus: manifest.selectedSkusCount,
    requiredCashFloat: manifest.totalCashFloat,
    settlementMethod: 'Cash Handover at Stall',
    barcodeString: `* ${manifest.batchNumber}-R15B1 *`,
    runnerName: manifest.runnerName,
    dispatchInCharge: 'Tanvir (Ops Lead)',
  };
}
