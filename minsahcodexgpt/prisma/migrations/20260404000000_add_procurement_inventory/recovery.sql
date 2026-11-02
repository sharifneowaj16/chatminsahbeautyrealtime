-- Recovery / Rollback for: 20260404000000_add_procurement_inventory
BEGIN;

DROP INDEX IF EXISTS "InventoryShortlist_priority_idx";

DROP INDEX IF EXISTS "InventoryShortlist_adminId_idx";

DROP INDEX IF EXISTS "InventoryShortlist_productId_key";

DROP INDEX IF EXISTS "PurchaseOrderItem_receivedAt_idx";

DROP INDEX IF EXISTS "PurchaseOrderItem_productId_idx";

DROP INDEX IF EXISTS "PurchaseOrderItem_purchaseOrderId_idx";

DROP INDEX IF EXISTS "PurchaseOrder_orderedAt_idx";

DROP INDEX IF EXISTS "PurchaseOrder_status_idx";

DROP INDEX IF EXISTS "PurchaseOrder_supplierId_idx";

DROP INDEX IF EXISTS "PurchaseOrder_orderNumber_key";

DROP INDEX IF EXISTS "SupplierProduct_isPreferred_idx";

DROP INDEX IF EXISTS "SupplierProduct_productId_idx";

DROP INDEX IF EXISTS "SupplierProduct_supplierId_idx";

DROP INDEX IF EXISTS "SupplierProduct_supplierId_productId_key";

DROP INDEX IF EXISTS "Supplier_isActive_idx";

DROP INDEX IF EXISTS "Supplier_name_idx";

DROP INDEX IF EXISTS "Supplier_code_key";

DROP TABLE IF EXISTS "InventoryShortlist" CASCADE;

DROP TABLE IF EXISTS "PurchaseOrderItem" CASCADE;

DROP TABLE IF EXISTS "PurchaseOrder" CASCADE;

DROP TABLE IF EXISTS "SupplierProduct" CASCADE;

DROP TABLE IF EXISTS "Supplier" CASCADE;

COMMIT;
