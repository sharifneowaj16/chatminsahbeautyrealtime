-- AlterTable
ALTER TABLE "Product" 
ADD COLUMN IF NOT EXISTS "deliveryChargeInsideDhaka" DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS "deliveryChargeOutsideDhaka" DECIMAL(10,2);
