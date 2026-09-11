-- Recovery: Rollback deliveryChargeInsideDhaka and deliveryChargeOutsideDhaka from Product table
ALTER TABLE "Product" 
DROP COLUMN IF EXISTS "deliveryChargeInsideDhaka",
DROP COLUMN IF EXISTS "deliveryChargeOutsideDhaka";
