# Full Project Structure Tree

This file contains the full project tree for the current repository, generated from the live filesystem and excluding `.git/` and `node_modules/`.

```text
minsahcodexgpt
|-- .github
|   `-- workflows
|       `-- ci.yml
|-- addtocardallfiles
|   |-- app-api-buy-now-orders-route.ts
|   |-- app-api-buy-now-shipping-route.ts
|   |-- app-api-cart-itemId-route.ts
|   |-- app-api-cart-route.ts
|   |-- app-cart-page.tsx
|   |-- app-categories-page.tsx
|   |-- app-components-InstantSearch.tsx
|   |-- app-components-ProductCard.tsx
|   |-- app-components-shop-ProductCard.tsx
|   |-- app-components-shop-ShopClient.tsx
|   |-- app-components-shop-ShopGrid.tsx
|   |-- app-components-shop-ShopSearchBar.tsx
|   |-- app-new-arrivals-page.tsx
|   |-- app-page.tsx
|   |-- app-products-id-components-AddToCartStepper.tsx
|   |-- app-products-id-components-ProductClient.tsx
|   |-- app-products-id-components-StickyBottomBar.tsx
|   |-- app-search-page.tsx
|   |-- app-shop-page.tsx
|   |-- app-wishlist-page.tsx
|   |-- components-cart-AddToCartStepper.tsx
|   |-- components-cart-BuyNowModal.tsx
|   |-- components-cart-CardBuyNowActionRow.tsx
|   |-- components-cart-CartStepper.tsx
|   |-- components-cart-VariantModal.tsx
|   |-- contexts-CartContext.tsx
|   |-- contexts-ProductsContext.tsx
|   `-- lib-buy-now.ts
|-- app
|   |-- about
|   |   `-- page.tsx
|   |-- account
|   |   |-- addresses
|   |   |   `-- page.tsx
|   |   |-- loyalty
|   |   |   `-- page.tsx
|   |   |-- orders
|   |   |   |-- [id]
|   |   |   |   |-- return
|   |   |   |   |   `-- page.tsx
|   |   |   |   `-- page.tsx
|   |   |   `-- page.tsx
|   |   |-- referrals
|   |   |   `-- page.tsx
|   |   |-- returns
|   |   |   `-- page.tsx
|   |   |-- reviews
|   |   |   |-- write
|   |   |   |   `-- page.tsx
|   |   |   `-- page.tsx
|   |   |-- settings
|   |   |   `-- page.tsx
|   |   |-- wishlist
|   |   |   `-- page.tsx
|   |   |-- layout.tsx
|   |   `-- page.tsx
|   |-- admin
|   |   |-- analytics
|   |   |   `-- page.tsx
|   |   |-- banners
|   |   |   `-- page.tsx
|   |   |-- blog
|   |   |   `-- page.tsx
|   |   |-- campaign-targeting
|   |   |   `-- page.tsx
|   |   |-- categories
|   |   |   `-- page.tsx
|   |   |-- contact
|   |   |   `-- page.tsx
|   |   |-- coupons
|   |   |   `-- page.tsx
|   |   |-- customers
|   |   |   `-- page.tsx
|   |   |-- faq
|   |   |   `-- page.tsx
|   |   |-- home-sections
|   |   |   |-- categories
|   |   |   |   `-- page.tsx
|   |   |   `-- page.tsx
|   |   |-- inbox
|   |   |   |-- layout.tsx
|   |   |   `-- page.tsx
|   |   |-- inventory
|   |   |   `-- page.tsx
|   |   |-- login
|   |   |   |-- layout.tsx
|   |   |   `-- page.tsx
|   |   |-- marketing
|   |   |   `-- page.tsx
|   |   |-- media
|   |   |   `-- page.tsx
|   |   |-- orders
|   |   |   |-- returns
|   |   |   |   `-- page.tsx
|   |   |   `-- page.tsx
|   |   |-- pages
|   |   |   `-- page.tsx
|   |   |-- products
|   |   |   |-- [id]
|   |   |   |   `-- edit
|   |   |   |       `-- page.tsx
|   |   |   |-- new
|   |   |   |   `-- page.tsx
|   |   |   `-- page.tsx
|   |   |-- promotions
|   |   |   `-- page.tsx
|   |   |-- retargeting
|   |   |   `-- page.tsx
|   |   |-- reviews
|   |   |   `-- page.tsx
|   |   |-- sales-by-region
|   |   |   `-- page.tsx
|   |   |-- settings
|   |   |   `-- page.tsx
|   |   |-- top-customers
|   |   |   `-- page.tsx
|   |   |-- tracking
|   |   |   `-- page.tsx
|   |   |-- users
|   |   |   `-- page.tsx
|   |   |-- AdminLayoutWrapper.tsx
|   |   |-- layout.tsx
|   |   `-- page.tsx
|   |-- api
|   |   |-- addresses
|   |   |   |-- [id]
|   |   |   |   `-- route.ts
|   |   |   `-- route.ts
|   |   |-- admin
|   |   |   |-- auth
|   |   |   |   |-- login
|   |   |   |   |   `-- route.ts
|   |   |   |   |-- logout
|   |   |   |   |   `-- route.ts
|   |   |   |   |-- me
|   |   |   |   |   `-- route.ts
|   |   |   |   `-- refresh
|   |   |   |       `-- route.ts
|   |   |   |-- customers
|   |   |   |   |-- [id]
|   |   |   |   |   `-- route.ts
|   |   |   |   `-- route.ts
|   |   |   |-- elasticsearch
|   |   |   |   `-- route.ts
|   |   |   |-- inbox
|   |   |   |   `-- reply
|   |   |   |       `-- route.ts
|   |   |   |-- inventory
|   |   |   |   |-- purchase-orders
|   |   |   |   |   |-- [id]
|   |   |   |   |   |   `-- receive
|   |   |   |   |   |       `-- route.ts
|   |   |   |   |   `-- route.ts
|   |   |   |   |-- shortlist
|   |   |   |   |   `-- route.ts
|   |   |   |   |-- suppliers
|   |   |   |   |   `-- route.ts
|   |   |   |   `-- route.ts
|   |   |   |-- notifications
|   |   |   |   `-- route.ts
|   |   |   |-- orders
|   |   |   |   |-- [id]
|   |   |   |   |   `-- route.ts
|   |   |   |   |-- returns
|   |   |   |   |   |-- [id]
|   |   |   |   |   |   `-- route.ts
|   |   |   |   |   `-- route.ts
|   |   |   |   `-- route.ts
|   |   |   |-- products
|   |   |   |   `-- [id]
|   |   |   |       `-- route.ts
|   |   |   |-- shipping
|   |   |   |   `-- steadfast
|   |   |   |       |-- balance
|   |   |   |       |   `-- route.ts
|   |   |   |       |-- send
|   |   |   |       |   `-- route.ts
|   |   |   |       |-- send-bulk
|   |   |   |       |   `-- route.ts
|   |   |   |       `-- sync
|   |   |   |           `-- route.ts
|   |   |   |-- site-config
|   |   |   |   `-- route.ts
|   |   |   |-- social
|   |   |   |   |-- facebook
|   |   |   |   |   `-- sync
|   |   |   |   |       `-- route.ts
|   |   |   |   |-- stream
|   |   |   |   |   `-- route.ts
|   |   |   |   `-- upload
|   |   |   |       `-- route.ts
|   |   |   `-- _utils.ts
|   |   |-- auth
|   |   |   |-- [...nextauth]
|   |   |   |   `-- route.ts
|   |   |   |-- avatar
|   |   |   |   `-- route.ts
|   |   |   |-- change-password
|   |   |   |   `-- route.ts
|   |   |   |-- forgot-password
|   |   |   |   `-- route.ts
|   |   |   |-- login
|   |   |   |   `-- route.ts
|   |   |   |-- logout
|   |   |   |   `-- route.ts
|   |   |   |-- me
|   |   |   |   `-- route.ts
|   |   |   |-- preferences
|   |   |   |   `-- route.ts
|   |   |   |-- profile
|   |   |   |   `-- route.ts
|   |   |   |-- refresh
|   |   |   |   `-- route.ts
|   |   |   |-- register
|   |   |   |   `-- route.ts
|   |   |   |-- reset-password
|   |   |   |   `-- route.ts
|   |   |   |-- verify
|   |   |   |   `-- route.ts
|   |   |   |-- verify-otp
|   |   |   |   `-- route.ts
|   |   |   `-- _utils.ts
|   |   |-- behavior
|   |   |   `-- route.ts
|   |   |-- buy-now
|   |   |   |-- orders
|   |   |   |   `-- route.ts
|   |   |   `-- shipping
|   |   |       `-- route.ts
|   |   |-- campaign-attribution
|   |   |   `-- route.ts
|   |   |-- cart
|   |   |   |-- [itemId]
|   |   |   |   `-- route.ts
|   |   |   `-- route.ts
|   |   |-- categories
|   |   |   |-- [id]
|   |   |   |   `-- route.ts
|   |   |   `-- route.ts
|   |   |-- facebook-capi
|   |   |   `-- route.ts
|   |   |-- gift
|   |   |   |-- [token]
|   |   |   |   |-- order
|   |   |   |   |   `-- route.ts
|   |   |   |   `-- route.ts
|   |   |   `-- create
|   |   |       `-- route.ts
|   |   |-- health
|   |   |   |-- minio
|   |   |   |   `-- route.ts
|   |   |   `-- route.ts
|   |   |-- img
|   |   |   `-- route.ts
|   |   |-- inventory
|   |   |   |-- [id]
|   |   |   |   `-- route.ts
|   |   |   `-- route.ts
|   |   |-- log-error
|   |   |   `-- route.ts
|   |   |-- media
|   |   |   `-- route.ts
|   |   |-- orders
|   |   |   `-- route.ts
|   |   |-- payments
|   |   |   |-- bkash
|   |   |   |   |-- create
|   |   |   |   |   `-- route.ts
|   |   |   |   `-- execute
|   |   |   |       `-- route.ts
|   |   |   |-- card
|   |   |   |   `-- create
|   |   |   |       `-- route.ts
|   |   |   |-- cod
|   |   |   |   `-- create
|   |   |   |       `-- route.ts
|   |   |   |-- nagad
|   |   |   |   `-- create
|   |   |   |       `-- route.ts
|   |   |   `-- rocket
|   |   |       `-- create
|   |   |           `-- route.ts
|   |   |-- products
|   |   |   |-- [id]
|   |   |   |   `-- route.ts
|   |   |   `-- route.ts
|   |   |-- returns
|   |   |   |-- [id]
|   |   |   |   `-- route.ts
|   |   |   |-- upload
|   |   |   |   `-- route.ts
|   |   |   `-- route.ts
|   |   |-- reviews
|   |   |   |-- [reviewId]
|   |   |   |   `-- route.ts
|   |   |   `-- route.ts
|   |   |-- search
|   |   |   |-- analytics
|   |   |   |   `-- route.ts
|   |   |   |-- clicks
|   |   |   |   `-- route.ts
|   |   |   |-- health
|   |   |   |   `-- route.ts
|   |   |   |-- metrics
|   |   |   |   `-- route.ts
|   |   |   |-- suggestions
|   |   |   |   `-- route.ts
|   |   |   |-- trending
|   |   |   |   `-- route.ts
|   |   |   |-- route.ts
|   |   |   |-- route.ts.backup
|   |   |   `-- route.ts.backup2
|   |   |-- search-history
|   |   |   `-- route.ts
|   |   |-- social
|   |   |   |-- messages
|   |   |   |   `-- route.ts
|   |   |   |-- reply
|   |   |   |   `-- route.ts
|   |   |   `-- webhook
|   |   |       `-- route.ts
|   |   |-- track
|   |   |   `-- route.ts
|   |   |-- tracking
|   |   |   `-- events
|   |   |       `-- route.ts
|   |   |-- tracking-device
|   |   |   `-- route.ts
|   |   |-- upload
|   |   |   |-- avatar
|   |   |   |   `-- route.ts
|   |   |   |-- banner
|   |   |   |   `-- route.ts
|   |   |   |-- blog
|   |   |   |   `-- route.ts
|   |   |   |-- brand
|   |   |   |   `-- route.ts
|   |   |   |-- category
|   |   |   |   `-- route.ts
|   |   |   |-- product
|   |   |   |   `-- route.ts
|   |   |   `-- route.ts
|   |   |-- webhook
|   |   |   `-- facebook
|   |   |       `-- route.ts
|   |   `-- wishlist
|   |       `-- [itemId]
|   |           `-- route.ts
|   |-- app
|   |   `-- api
|   |       `-- categories
|   |           `-- [id]
|   |               `-- route.ts
|   |-- blog
|   |   `-- page.tsx
|   |-- brands
|   |   `-- page.tsx
|   |-- cart
|   |   `-- page.tsx
|   |-- categories
|   |   `-- page.tsx
|   |-- checkout
|   |   |-- add-address
|   |   |   `-- page.tsx
|   |   |-- order-confirmed
|   |   |   `-- page.tsx
|   |   |-- payment
|   |   |   |-- bkash
|   |   |   |   `-- page.tsx
|   |   |   |-- card
|   |   |   |   `-- page.tsx
|   |   |   |-- nagad
|   |   |   |   `-- page.tsx
|   |   |   `-- rocket
|   |   |       `-- page.tsx
|   |   |-- payment-method
|   |   |   `-- page.tsx
|   |   |-- select-address
|   |   |   `-- page.tsx
|   |   |-- CheckoutClient.tsx
|   |   `-- page.tsx
|   |-- combos
|   |   `-- page.tsx
|   |-- components
|   |   |-- admin
|   |   |   |-- AdminDashboard.tsx
|   |   |   |-- AdminLayout.tsx
|   |   |   |-- CustomerManagement.tsx
|   |   |   |-- GoogleServicesIntegration.tsx
|   |   |   |-- MarketingHub.tsx
|   |   |   |-- OrderManagement.tsx
|   |   |   |-- ProductManagement.tsx
|   |   |   |-- SocialMediaInbox.tsx
|   |   |   |-- SocialMediaInboxChat.tsx
|   |   |   `-- WhatsAppIntegration.tsx
|   |   |-- google
|   |   |   |-- AnalyticsDashboard.tsx
|   |   |   |-- BusinessProfileCard.tsx
|   |   |   |-- GoogleAdsManager.tsx
|   |   |   |-- GoogleHubDashboard.tsx
|   |   |   |-- IntegrationStatus.tsx
|   |   |   |-- MerchantCenterCard.tsx
|   |   |   |-- QuickActions.tsx
|   |   |   |-- RemarketingCard.tsx
|   |   |   |-- SearchConsoleCard.tsx
|   |   |   `-- TagManagerCard.tsx
|   |   |-- marketing
|   |   |   |-- ContentCalendar.tsx
|   |   |   |-- PlatformCard.tsx
|   |   |   |-- PostScheduler.tsx
|   |   |   `-- SocialDashboard.tsx
|   |   |-- shop
|   |   |   |-- ActiveFilters.tsx
|   |   |   |-- ProductCard.tsx
|   |   |   |-- ShopClient.tsx
|   |   |   |-- ShopGrid.tsx
|   |   |   |-- ShopSearchBar.tsx
|   |   |   `-- SortDropdown.tsx
|   |   |-- AdvancedSearch.tsx
|   |   |-- AutocompleteSearch.tsx
|   |   |-- ErrorBoundary.tsx
|   |   |-- Footer.tsx
|   |   |-- Header.tsx
|   |   |-- InstantSearch.tsx
|   |   |-- MegaMenu.tsx
|   |   |-- MobileMenu.tsx
|   |   |-- ProductCard.tsx
|   |   |-- SocialFloatingButtons.tsx
|   |   `-- TopBar.tsx
|   |-- contact
|   |   `-- page.tsx
|   |-- data-deletion
|   |   `-- page.tsx
|   |-- faq
|   |   `-- page.tsx
|   |-- favourites
|   |   `-- page.tsx
|   |-- flash-sale
|   |   `-- page.tsx
|   |-- forgot-password
|   |   `-- page.tsx
|   |-- for-you
|   |   `-- page.tsx
|   |-- gift
|   |   `-- [token]
|   |       |-- GiftPageClient.tsx
|   |       `-- page.tsx
|   |-- login
|   |   `-- page.tsx
|   |-- marketing
|   |   |-- google
|   |   |   `-- page.tsx
|   |   |-- social
|   |   |   `-- page.tsx
|   |   `-- page.tsx
|   |-- new-arrivals
|   |   `-- page.tsx
|   |-- password-reset-success
|   |   `-- page.tsx
|   |-- privacy
|   |   `-- page.tsx
|   |-- products
|   |   `-- [id]
|   |       |-- components
|   |       |   |-- AddToCartStepper.tsx
|   |       |   |-- GiftShareButtons.tsx
|   |       |   |-- ProductClient.tsx
|   |       |   |-- ProductGallery.tsx
|   |       |   |-- ProductStickyHeader.tsx
|   |       |   |-- ReviewSection.tsx
|   |       |   |-- SocialLoginModal.tsx
|   |       |   |-- StickyBottomBar.tsx
|   |       |   `-- VariantSelector.tsx
|   |       |-- loading.tsx
|   |       |-- not found.tsx
|   |       `-- page.tsx
|   |-- recommendations
|   |   `-- page.tsx
|   |-- register
|   |   `-- page.tsx
|   |-- reset-password
|   |   `-- page.tsx
|   |-- search
|   |   `-- page.tsx
|   |-- shop
|   |   `-- page.tsx
|   |-- test
|   |   `-- page.tsx
|   |-- track
|   |   `-- page.tsx
|   |-- verify-otp
|   |   `-- page.tsx
|   |-- wishlist
|   |   `-- page.tsx
|   |-- encoding-provider.tsx
|   |-- favicon.ico
|   |-- globals.css
|   |-- layout.tsx
|   |-- not-found.tsx
|   `-- page.tsx
|-- cathbackendnode
|   |-- app-api-admin-inbox-reply-route.ts
|   |-- app-api-admin-social-facebook-sync-route.ts
|   |-- app-api-admin-social-stream-route.ts
|   |-- app-api-social-messages-route.ts
|   |-- app-api-social-reply-route.ts
|   |-- app-api-social-webhook-route.ts
|   |-- app-api-webhook-facebook-route.ts
|   |-- app-components-admin-SocialMediaInbox.tsx
|   |-- app-components-admin-SocialMediaInboxChat.tsx
|   |-- docker-compose.realtime.yml
|   |-- env.example
|   |-- hooks-useInboxSocket.ts
|   |-- prisma-migrations-20260411000000_add_fb_conversation_messages-migration.sql
|   |-- prisma-schema.prisma
|   |-- realtime-service-.env.example
|   |-- realtime-service-Dockerfile
|   |-- realtime-service-package.json
|   |-- realtime-service-prisma-schema.prisma
|   |-- realtime-service-src-app.ts
|   |-- realtime-service-src-config.ts
|   |-- realtime-service-src-db-client.ts
|   |-- realtime-service-src-db-repository.ts
|   |-- realtime-service-src-facebook-events.ts
|   |-- realtime-service-src-facebook-graph.client.ts
|   |-- realtime-service-src-facebook-signature.ts
|   |-- realtime-service-src-facebook-types.ts
|   |-- realtime-service-src-index.ts
|   |-- realtime-service-src-realtime-pubsub.ts
|   |-- realtime-service-src-realtime-ws-server.ts
|   |-- realtime-service-src-routes-reply.router.ts
|   |-- realtime-service-src-routes-webhook.router.ts
|   `-- realtime-service-tsconfig.json
|-- components
|   |-- account
|   |   |-- account-layout-client.tsx
|   |   |-- addresses-client.tsx
|   |   |-- dashboard-client.tsx
|   |   |-- loyalty-client.tsx
|   |   |-- order-detail-client.tsx
|   |   |-- orders-client.tsx
|   |   |-- referrals-client.tsx
|   |   |-- return-request-client.tsx
|   |   |-- returns-client.tsx
|   |   |-- review-form-client.tsx
|   |   |-- reviews-client.tsx
|   |   |-- settings-client.tsx
|   |   `-- wishlist-client.tsx
|   |-- admin
|   |   |-- admin-login-client.tsx
|   |   |-- admin-marketing-client.tsx
|   |   |-- AdminNotificationBell.tsx
|   |   |-- SteadfastBulkDispatch.tsx
|   |   |-- SteadfastShipPanel.tsx
|   |   `-- SteadfastStatusBadge.tsx
|   |-- cart
|   |   |-- AddToCartStepper.tsx
|   |   |-- BuyNowModal.tsx
|   |   |-- CardBuyNowActionRow.tsx
|   |   |-- CardBuyNowButton.tsx
|   |   |-- CartStepper.tsx
|   |   `-- VariantModal.tsx
|   |-- reset-password-client.tsx
|   |-- SafeText.tsx
|   `-- verify-otp-client.tsx
|-- contexts
|   |-- AdminAuthContext.tsx
|   |-- AdminInventoryContext.tsx
|   |-- AuthContext.tsx
|   |-- CartContext.tsx
|   |-- CategoriesContext.tsx
|   |-- ProductsContext.tsx
|   `-- TrackingContext.tsx
|-- data
|   |-- bangladesh-locations.ts
|   `-- categories.ts
|-- docs
|   |-- api-inventory.md
|   |-- api-missing.md
|   |-- encoding-fix-examples.md
|   `-- FACEBOOK_CONVERSION_API_GUIDE.md
|-- hooks
|   |-- useInboxSocket.ts
|   `-- useSwipeAndScrollHeader.ts
|-- lib
|   |-- auth
|   |   |-- jwt.ts
|   |   |-- nextauth.ts
|   |   `-- password.ts
|   |-- cache
|   |   `-- redis.ts
|   |-- elasticsearch
|   |   |-- ctrBoost.ts
|   |   |-- filterBuilder.ts
|   |   |-- indexing.ts
|   |   |-- metrics.ts
|   |   |-- searchAnalytics.ts
|   |   |-- trending.ts
|   |   `-- utils.ts
|   |-- encoding
|   |   |-- core.ts
|   |   |-- index.ts
|   |   |-- interceptor.ts
|   |   `-- react-hooks.ts
|   |-- facebook
|   |   |-- inboxSync.ts
|   |   |-- pixel.tsx
|   |   |-- profile.ts
|   |   `-- utils.ts
|   |-- payments
|   |   |-- bkash.ts
|   |   |-- nagad.ts
|   |   |-- README.md
|   |   |-- rocket.ts
|   |   `-- sslcommerz.ts
|   |-- queue
|   |   |-- productQueue.ts
|   |   `-- steadfastQueue.ts
|   |-- search
|   |   `-- productTransformer.ts
|   |-- social
|   |   `-- socialMessageIngest.ts
|   |-- steadfast
|   |   `-- client.ts
|   |-- storage
|   |   `-- minio.ts
|   |-- tracking
|   |   |-- pixels
|   |   |   |-- AllPixels.tsx
|   |   |   |-- ClarityPixel.tsx
|   |   |   |-- FacebookPixel.tsx
|   |   |   |-- GoogleAnalytics.tsx
|   |   |   |-- GoogleTagManager.tsx
|   |   |   |-- HotjarPixel.tsx
|   |   |   |-- LinkedInPixel.tsx
|   |   |   |-- MicrosoftPixel.tsx
|   |   |   |-- MixpanelPixel.tsx
|   |   |   |-- PinterestPixel.tsx
|   |   |   |-- RedditPixel.tsx
|   |   |   |-- SnapchatPixel.tsx
|   |   |   |-- TikTokPixel.tsx
|   |   |   `-- TwitterPixel.tsx
|   |   |-- behavior.ts
|   |   |-- campaigns.ts
|   |   `-- manager.ts
|   |-- workers
|   |   |-- productWorker.ts
|   |   `-- steadfastWorker.ts
|   |-- auth.ts
|   |-- buy-now.ts
|   |-- elasticsearch.ts
|   |-- env.ts
|   |-- fixEncoding.ts
|   |-- homeData.ts
|   |-- logger.ts
|   |-- minio.ts
|   |-- prisma.ts
|   |-- productAdapter.ts
|   |-- productData.ts
|   |-- redis.ts
|   `-- shopUtils.ts
|-- minsahinboxcodex
|   |-- backend
|   |   |-- app-api-admin-social-facebook-sync-route.ts
|   |   |-- app-api-admin-social-stream-route.ts
|   |   |-- app-api-admin-social-upload-route.ts
|   |   |-- app-api-social-messages-route.ts
|   |   |-- app-api-social-reply-route.ts
|   |   |-- app-api-social-webhook-route.ts
|   |   |-- app-api-webhook-facebook-route.ts
|   |   |-- lib-facebook-inboxSync.ts
|   |   |-- lib-facebook-profile.ts
|   |   `-- lib-social-socialMessageIngest.ts
|   `-- frontend
|       |-- app-components-admin-SocialMediaInbox.tsx
|       `-- components-admin-admin-marketing-client.tsx
|-- prisma
|   |-- migrations
|   |   |-- 20260206231151_init
|   |   |   `-- migration.sql
|   |   |-- 20260212000000_add_site_config
|   |   |   `-- migration.sql
|   |   |-- 20260212100000_add_customer_behavior
|   |   |   `-- migration.sql
|   |   |-- 20260212110000_add_search_history
|   |   |   `-- migration.sql
|   |   |-- 20260212120000_add_campaign_attribution
|   |   |   `-- migration.sql
|   |   |-- 20260212130000_add_tracking_device
|   |   |   `-- migration.sql
|   |   |-- 20260213000000_add_returns
|   |   |   `-- migration.sql
|   |   |-- 20260216000000_add_search_click_tracking
|   |   |   `-- migration.sql
|   |   |-- 20260219000000_add_seo_fields
|   |   |   `-- migration.sql
|   |   |-- 20260221094858_add_product_fields
|   |   |   `-- migration.sql
|   |   |-- 20260225160326_add_social_message
|   |   |   `-- migration.sql
|   |   |-- 20260322000000_add_gift_requests
|   |   |   `-- migration.sql
|   |   |-- 20260322000001_add_gift_type
|   |   |   `-- migration.sql
|   |   |-- 20260322000002_add_gift_sender_id
|   |   |   `-- migration.sql
|   |   |-- 20260322000003_add_gift_sender_phone
|   |   |   `-- migration.sql
|   |   |-- 20260324000000_add_gift_order_fields
|   |   |   `-- migration.sql
|   |   |-- 20260324000001_add_admin_notifications
|   |   |   `-- migration.sql
|   |   |-- 20260404000000_add_procurement_inventory
|   |   |   `-- migration.sql
|   |   |-- 20260409000000_add_social_message_attachments
|   |   |   `-- migration.sql
|   |   |-- 20260411000000_add_fb_conversation_messages
|   |   |   `-- migration.sql
|   |   `-- migration_lock.toml
|   |-- schema.prisma
|   `-- seed.ts
|-- public
|   |-- images
|   |   |-- hero-image.jpg
|   |   `-- main-block-decor.png
|   |-- file.svg
|   |-- globe.svg
|   |-- next.svg
|   |-- vercel.svg
|   `-- window.svg
|-- realtime-service
|   |-- prisma
|   |   `-- schema.prisma
|   |-- src
|   |   |-- db
|   |   |   |-- client.ts
|   |   |   `-- repository.ts
|   |   |-- facebook
|   |   |   |-- events.ts
|   |   |   |-- graph.client.ts
|   |   |   |-- signature.ts
|   |   |   `-- types.ts
|   |   |-- realtime
|   |   |   |-- pubsub.ts
|   |   |   `-- ws-server.ts
|   |   |-- routes
|   |   |   |-- reply.router.ts
|   |   |   `-- webhook.router.ts
|   |   |-- app.ts
|   |   |-- config.ts
|   |   `-- index.ts
|   |-- .env.example
|   |-- Dockerfile
|   |-- package.json
|   `-- tsconfig.json
|-- scripts
|   |-- init-elasticsearch.ts
|   |-- migrate-to-v9.ts
|   |-- recompressImages.ts
|   |-- reindex-elasticsearch.ts
|   |-- reindexProducts.ts
|   `-- test-elasticsearch.ts
|-- types
|   |-- admin.ts
|   |-- bullmq.d.ts
|   |-- facebook.ts
|   |-- geography.ts
|   |-- google.ts
|   |-- product.ts
|   |-- search.ts
|   |-- social.ts
|   |-- tracking.ts
|   `-- user.ts
|-- utils
|   |-- currency.ts
|   |-- formatting.ts
|   `-- socialIcons.tsx
|-- .env.example
|-- .gitignore
|-- check.text
|-- CLAUDE.md
|-- COLOR_PALETTE.md
|-- docker-compose.realtime.yml
|-- eslint.config.mjs
|-- INSTAGRAM_ENCODING_FIX_SUMMARY.md
|-- instrumentation.ts
|-- middleware.ts
|-- next.config.ts
|-- nixpacks.toml
|-- package.json
|-- package-lock.json
|-- PAYMENT_SETUP.md
|-- postcss.config.mjs
|-- prisma.config.ts
|-- PROJECT_STRUCTURE.md
|-- PROJECT_STRUCTURE_TREE.md
|-- README.md
|-- test-encoding-fix.tsx
`-- tsconfig.json
```
