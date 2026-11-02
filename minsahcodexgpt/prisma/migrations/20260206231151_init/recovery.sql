-- Recovery / Rollback for: 20260206231151_init
BEGIN;

DROP INDEX IF EXISTS "Coupon_isActive_idx";

DROP INDEX IF EXISTS "Coupon_code_idx";

DROP INDEX IF EXISTS "Coupon_code_key";

DROP INDEX IF EXISTS "Review_isApproved_idx";

DROP INDEX IF EXISTS "Review_productId_idx";

DROP INDEX IF EXISTS "Review_userId_idx";

DROP INDEX IF EXISTS "Payment_transactionId_idx";

DROP INDEX IF EXISTS "Payment_orderId_idx";

DROP INDEX IF EXISTS "OrderItem_orderId_idx";

DROP INDEX IF EXISTS "Order_createdAt_idx";

DROP INDEX IF EXISTS "Order_status_idx";

DROP INDEX IF EXISTS "Order_orderNumber_idx";

DROP INDEX IF EXISTS "Order_userId_idx";

DROP INDEX IF EXISTS "Order_orderNumber_key";

DROP INDEX IF EXISTS "WishlistItem_userId_productId_key";

DROP INDEX IF EXISTS "WishlistItem_userId_idx";

DROP INDEX IF EXISTS "CartItem_userId_productId_variantId_key";

DROP INDEX IF EXISTS "CartItem_userId_idx";

DROP INDEX IF EXISTS "ProductVariant_sku_idx";

DROP INDEX IF EXISTS "ProductVariant_productId_idx";

DROP INDEX IF EXISTS "ProductVariant_sku_key";

DROP INDEX IF EXISTS "ProductImage_productId_idx";

DROP INDEX IF EXISTS "Product_isActive_isFeatured_idx";

DROP INDEX IF EXISTS "Product_brandId_idx";

DROP INDEX IF EXISTS "Product_categoryId_idx";

DROP INDEX IF EXISTS "Product_sku_idx";

DROP INDEX IF EXISTS "Product_slug_idx";

DROP INDEX IF EXISTS "Product_slug_key";

DROP INDEX IF EXISTS "Product_sku_key";

DROP INDEX IF EXISTS "Brand_slug_idx";

DROP INDEX IF EXISTS "Brand_slug_key";

DROP INDEX IF EXISTS "Category_parentId_idx";

DROP INDEX IF EXISTS "Category_slug_idx";

DROP INDEX IF EXISTS "Category_slug_key";

DROP INDEX IF EXISTS "Address_userId_idx";

DROP INDEX IF EXISTS "AdminRefreshToken_token_idx";

DROP INDEX IF EXISTS "AdminRefreshToken_adminId_idx";

DROP INDEX IF EXISTS "AdminRefreshToken_token_key";

DROP INDEX IF EXISTS "AdminUser_email_idx";

DROP INDEX IF EXISTS "AdminUser_email_key";

DROP INDEX IF EXISTS "PasswordResetToken_token_idx";

DROP INDEX IF EXISTS "PasswordResetToken_email_idx";

DROP INDEX IF EXISTS "PasswordResetToken_token_key";

DROP INDEX IF EXISTS "VerificationToken_identifier_token_key";

DROP INDEX IF EXISTS "VerificationToken_token_key";

DROP INDEX IF EXISTS "RefreshToken_token_idx";

DROP INDEX IF EXISTS "RefreshToken_userId_idx";

DROP INDEX IF EXISTS "RefreshToken_token_key";

DROP INDEX IF EXISTS "Session_userId_idx";

DROP INDEX IF EXISTS "Session_sessionToken_key";

DROP INDEX IF EXISTS "Account_provider_providerAccountId_key";

DROP INDEX IF EXISTS "Account_userId_idx";

DROP INDEX IF EXISTS "User_referralCode_idx";

DROP INDEX IF EXISTS "User_email_idx";

DROP INDEX IF EXISTS "User_referralCode_key";

DROP INDEX IF EXISTS "User_email_key";

DROP TABLE IF EXISTS "Coupon" CASCADE;

DROP TABLE IF EXISTS "Review" CASCADE;

DROP TABLE IF EXISTS "Payment" CASCADE;

DROP TABLE IF EXISTS "OrderItem" CASCADE;

DROP TABLE IF EXISTS "Order" CASCADE;

DROP TABLE IF EXISTS "WishlistItem" CASCADE;

DROP TABLE IF EXISTS "CartItem" CASCADE;

DROP TABLE IF EXISTS "ProductVariant" CASCADE;

DROP TABLE IF EXISTS "ProductImage" CASCADE;

DROP TABLE IF EXISTS "Product" CASCADE;

DROP TABLE IF EXISTS "Brand" CASCADE;

DROP TABLE IF EXISTS "Category" CASCADE;

DROP TABLE IF EXISTS "Address" CASCADE;

DROP TABLE IF EXISTS "AdminRefreshToken" CASCADE;

DROP TABLE IF EXISTS "AdminUser" CASCADE;

DROP TABLE IF EXISTS "PasswordResetToken" CASCADE;

DROP TABLE IF EXISTS "VerificationToken" CASCADE;

DROP TABLE IF EXISTS "RefreshToken" CASCADE;

DROP TABLE IF EXISTS "Session" CASCADE;

DROP TABLE IF EXISTS "Account" CASCADE;

DROP TABLE IF EXISTS "User" CASCADE;

DROP TYPE IF EXISTS "CouponType" CASCADE;

DROP TYPE IF EXISTS "PaymentStatus" CASCADE;

DROP TYPE IF EXISTS "OrderStatus" CASCADE;

DROP TYPE IF EXISTS "AddressType" CASCADE;

DROP TYPE IF EXISTS "UserStatus" CASCADE;

DROP TYPE IF EXISTS "AdminRole" CASCADE;

DROP TYPE IF EXISTS "UserRole" CASCADE;

COMMIT;
