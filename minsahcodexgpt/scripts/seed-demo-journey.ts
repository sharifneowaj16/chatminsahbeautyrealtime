import "dotenv/config";
import prisma from "../lib/prisma";
import { Prisma, $Enums } from "../generated/prisma/client";
import bcrypt from "bcryptjs";

async function main() {
  console.log("🌸 Starting Minsah Beauty Full Journey Demo Seed...");

  // 1. Fetch available products
  const products = await prisma.product.findMany({
    take: 12,
    where: { isActive: true },
    include: { images: true },
  });

  if (products.length === 0) {
    console.error("❌ No products found in the database. Please run npm run db:seed first.");
    process.exit(1);
  }

  console.log(`📦 Found ${products.length} active products in catalog.`);

  const p1 = products[0];
  const p2 = products[1] || products[0];
  const p3 = products[2] || products[0];
  const p4 = products[3] || products[0];

  const passwordHash = await bcrypt.hash("Password123!", 10);

  // 2. Upsert VIP Demo Customer
  console.log("👑 Upserting VIP Customer (Sumaiya Rahman)...");
  const demoUser = await prisma.user.upsert({
    where: { email: "vip.demo@minsahbeauty.cloud" },
    update: {
      firstName: "Sumaiya",
      lastName: "Rahman",
      phone: "01711111111",
      role: $Enums.UserRole.VIP,
      status: $Enums.UserStatus.ACTIVE,
      loyaltyPoints: 1250,
      referralCode: "VIP-SUMAIYA",
      passwordHash,
    },
    create: {
      email: "vip.demo@minsahbeauty.cloud",
      firstName: "Sumaiya",
      lastName: "Rahman",
      phone: "01711111111",
      role: $Enums.UserRole.VIP,
      status: $Enums.UserStatus.ACTIVE,
      loyaltyPoints: 1250,
      referralCode: "VIP-SUMAIYA",
      passwordHash,
    },
  });

  // Secondary Phone Demo User (01700000000)
  await prisma.user.upsert({
    where: { email: "vip.phone@minsahbeauty.cloud" },
    update: {
      firstName: "Sumaiya",
      lastName: "VIP",
      phone: "01700000000",
      role: $Enums.UserRole.VIP,
      status: $Enums.UserStatus.ACTIVE,
      loyaltyPoints: 1250,
      passwordHash,
    },
    create: {
      email: "vip.phone@minsahbeauty.cloud",
      firstName: "Sumaiya",
      lastName: "VIP",
      phone: "01700000000",
      role: $Enums.UserRole.VIP,
      status: $Enums.UserStatus.ACTIVE,
      loyaltyPoints: 1250,
      passwordHash,
    },
  });

  // 3. Saved Addresses
  console.log("📍 Creating delivery addresses...");
  await prisma.address.deleteMany({ where: { userId: demoUser.id } });

  const dhakaAddress = await prisma.address.create({
    data: {
      userId: demoUser.id,
      firstName: "Sumaiya",
      lastName: "Rahman",
      street1: "House 34, Road 11, Block D",
      street2: "Banani",
      city: "Dhaka",
      state: "Dhaka Metro",
      postalCode: "1213",
      country: "Bangladesh",
      phone: "01711111111",
      isDefault: true,
      type: $Enums.AddressType.SHIPPING,
    },
  });

  await prisma.address.create({
    data: {
      userId: demoUser.id,
      firstName: "Sumaiya",
      lastName: "Rahman",
      street1: "Flat 5B, Concord Tower",
      street2: "GEC Circle",
      city: "Chattogram",
      state: "Chattogram",
      postalCode: "4000",
      country: "Bangladesh",
      phone: "01711111111",
      isDefault: false,
      type: $Enums.AddressType.SHIPPING,
    },
  });

  // 4. Clean & Seed Orders for this User
  console.log("📦 Creating 5 customer orders with live tracking timelines...");
  await prisma.order.deleteMany({ where: { userId: demoUser.id } });

  // Order 1: Dispatched via Steadfast (In Transit)
  const order1 = await prisma.order.create({
    data: {
      orderNumber: "ORD-2026-9821",
      userId: demoUser.id,
      addressId: dhakaAddress.id,
      status: $Enums.OrderStatus.SHIPPED,
      paymentStatus: $Enums.PaymentStatus.COMPLETED,
      paymentMethod: "bkash",
      shippingMethod: "steadfast",
      steadfastTrackingCode: "STEAD-992144",
      steadfastConsignmentId: "CID-88219",
      steadfastStatus: "in_transit",
      subtotal: new Prisma.Decimal(Number(p1.price) + Number(p2.price)),
      shippingCost: new Prisma.Decimal(0),
      deliveryDiscountAmount: new Prisma.Decimal(60),
      deliveryOfferBadgeText: "Free Delivery Nationwide",
      discountAmount: new Prisma.Decimal(0),
      total: new Prisma.Decimal(Number(p1.price) + Number(p2.price)),
      paidAt: new Date(Date.now() - 3600000 * 24),
      shippedAt: new Date(Date.now() - 3600000 * 12),
      createdAt: new Date(Date.now() - 3600000 * 24),
      adminNote: "Quality Inspected & Dispatched via Steadfast Express Banani Hub.",
      items: {
        create: [
          {
            name: p1.name,
            sku: p1.sku,
            price: new Prisma.Decimal(Number(p1.price)),
            quantity: 1,
            total: new Prisma.Decimal(Number(p1.price)),
            productId: p1.id,
          },
          {
            name: p2.name,
            sku: p2.sku,
            price: new Prisma.Decimal(Number(p2.price)),
            quantity: 1,
            total: new Prisma.Decimal(Number(p2.price)),
            productId: p2.id,
          },
        ],
      },
      payments: {
        create: [
          {
            amount: new Prisma.Decimal(Number(p1.price) + Number(p2.price)),
            method: "bkash",
            status: $Enums.PaymentStatus.COMPLETED,
            transactionId: "TRX-BK-9912048",
          },
        ],
      },
    },
  });

  // Order 2: Delivered with Authenticity Hologram Seal
  await prisma.order.create({
    data: {
      orderNumber: "ORD-2026-8712",
      userId: demoUser.id,
      addressId: dhakaAddress.id,
      status: $Enums.OrderStatus.DELIVERED,
      paymentStatus: $Enums.PaymentStatus.COMPLETED,
      paymentMethod: "credit_card",
      shippingMethod: "pathao",
      pathaoTrackingCode: "PATHAO-DH-441208",
      pathaoConsignmentId: "CID-PATHAO-1092",
      pathaoStatus: "delivered",
      subtotal: new Prisma.Decimal(Number(p3.price)),
      shippingCost: new Prisma.Decimal(60),
      total: new Prisma.Decimal(Number(p3.price) + 60),
      paidAt: new Date(Date.now() - 3600000 * 72),
      shippedAt: new Date(Date.now() - 3600000 * 48),
      deliveredAt: new Date(Date.now() - 3600000 * 10),
      createdAt: new Date(Date.now() - 3600000 * 72),
      adminNote: "Delivered & Hologram Seal Verified.",
      items: {
        create: [
          {
            name: p3.name,
            sku: p3.sku,
            price: new Prisma.Decimal(Number(p3.price)),
            quantity: 1,
            total: new Prisma.Decimal(Number(p3.price)),
            productId: p3.id,
          },
        ],
      },
      payments: {
        create: [
          {
            amount: new Prisma.Decimal(Number(p3.price) + 60),
            method: "credit_card",
            status: $Enums.PaymentStatus.COMPLETED,
            transactionId: "CARD-AUTH-88129",
          },
        ],
      },
    },
  });

  // Order 3: Processing (Cash on Delivery)
  await prisma.order.create({
    data: {
      orderNumber: "ORD-2026-7512",
      userId: demoUser.id,
      addressId: dhakaAddress.id,
      status: $Enums.OrderStatus.PROCESSING,
      paymentStatus: $Enums.PaymentStatus.PENDING,
      paymentMethod: "cash_on_delivery",
      shippingMethod: "steadfast",
      subtotal: new Prisma.Decimal(Number(p4.price)),
      shippingCost: new Prisma.Decimal(60),
      total: new Prisma.Decimal(Number(p4.price) + 60),
      createdAt: new Date(Date.now() - 3600000 * 3),
      adminNote: "Awaiting packaging and courier dispatch.",
      items: {
        create: [
          {
            name: p4.name,
            sku: p4.sku,
            price: new Prisma.Decimal(Number(p4.price)),
            quantity: 1,
            total: new Prisma.Decimal(Number(p4.price)),
            productId: p4.id,
          },
        ],
      },
    },
  });

  // Order 4: Delivered with Return Request
  const order4 = await prisma.order.create({
    data: {
      orderNumber: "ORD-2026-6204",
      userId: demoUser.id,
      addressId: dhakaAddress.id,
      status: $Enums.OrderStatus.DELIVERED,
      paymentStatus: $Enums.PaymentStatus.COMPLETED,
      paymentMethod: "bkash",
      subtotal: new Prisma.Decimal(850),
      shippingCost: new Prisma.Decimal(60),
      total: new Prisma.Decimal(910),
      paidAt: new Date(Date.now() - 3600000 * 240),
      deliveredAt: new Date(Date.now() - 3600000 * 180),
      createdAt: new Date(Date.now() - 3600000 * 240),
      items: {
        create: [
          {
            name: "Revlon Super Lustrous Lipstick - Fire & Ice",
            sku: "REV-LIPS-001",
            price: new Prisma.Decimal(850),
            quantity: 1,
            total: new Prisma.Decimal(850),
            productId: p1.id,
          },
        ],
      },
    },
  });

  // Return Request for Order 4
  console.log("🔄 Creating return claim for Order 4...");
  await prisma.return.deleteMany({ where: { userId: demoUser.id } });
  await prisma.return.create({
    data: {
      returnNumber: "RET-2026-881",
      orderId: order4.id,
      userId: demoUser.id,
      reason: "Color / Shade does not match photo expectation",
      status: $Enums.ReturnStatus.APPROVED,
      refundAmount: new Prisma.Decimal(850),
      adminNote: "Return approved. Customer offered free exchange or wallet refund.",
      images: ["/images/returns/sample-claim.jpg"],
    },
  });

  // Order 5: Older Delivered Order
  await prisma.order.create({
    data: {
      orderNumber: "ORD-2026-5100",
      userId: demoUser.id,
      addressId: dhakaAddress.id,
      status: $Enums.OrderStatus.DELIVERED,
      paymentStatus: $Enums.PaymentStatus.COMPLETED,
      paymentMethod: "bkash",
      subtotal: new Prisma.Decimal(1599),
      shippingCost: new Prisma.Decimal(0),
      total: new Prisma.Decimal(1599),
      paidAt: new Date(Date.now() - 3600000 * 500),
      deliveredAt: new Date(Date.now() - 3600000 * 450),
      createdAt: new Date(Date.now() - 3600000 * 500),
      items: {
        create: [
          {
            name: p2.name,
            sku: p2.sku,
            price: new Prisma.Decimal(Number(p2.price)),
            quantity: 1,
            total: new Prisma.Decimal(Number(p2.price)),
            productId: p2.id,
          },
        ],
      },
    },
  });

  // 5. Wishlist Items
  console.log("❤️  Adding 4 items to user wishlist...");
  await prisma.wishlistItem.deleteMany({ where: { userId: demoUser.id } });
  for (const prod of [p1, p2, p3, p4]) {
    await prisma.wishlistItem.create({
      data: {
        userId: demoUser.id,
        productId: prod.id,
      },
    });
  }

  // 6. Active Promo Coupons
  console.log("🎟️  Creating promo vouchers for checkout testing...");
  const couponsData = [
    {
      code: "VIP15",
      description: "Exclusive 15% discount for Minsah VIP Club members",
      type: $Enums.CouponType.PERCENTAGE,
      value: 15,
      minPurchase: 1000,
      isActive: true,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
    {
      code: "MINSAH150",
      description: "Flat ৳150 off on orders over ৳1,000",
      type: $Enums.CouponType.FIXED,
      value: 150,
      minPurchase: 1000,
      isActive: true,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
    {
      code: "FREESHIP",
      description: "Free delivery nationwide on orders over ৳999",
      type: $Enums.CouponType.FREE_SHIPPING,
      value: 0,
      minPurchase: 999,
      isActive: true,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
    {
      code: "WELCOME10",
      description: "Welcome 10% discount on first order",
      type: $Enums.CouponType.PERCENTAGE,
      value: 10,
      minPurchase: 500,
      isActive: true,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const c of couponsData) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: c,
      create: c,
    });
  }

  // 7. Verified Reviews
  console.log("⭐ Adding customer product reviews...");
  await prisma.review.deleteMany({ where: { userId: demoUser.id } });
  await prisma.review.create({
    data: {
      userId: demoUser.id,
      productId: p1.id,
      rating: 5,
      title: "100% Genuine product & amazing glow!",
      comment: "Been using this serum for 3 weeks. Genuine import with security seal intact. Delivered in 24 hours in Dhaka!",
      isVerified: true,
      isApproved: true,
    },
  });

  console.log("");
  console.log("✨ ======================================================= ✨");
  console.log("🎉 Full Journey Demo Seed Created Successfully!");
  console.log("✨ ======================================================= ✨");
  console.log("");
  console.log("📱 VIP TEST USER CREDENTIALS:");
  console.log("   Phone: 01711111111  (or 01700000000)");
  console.log("   OTP:   123456       (or 000000)");
  console.log("   Email: vip.demo@minsahbeauty.cloud");
  console.log("   Pass:  Password123!");
  console.log("");
  console.log("📊 USER DASHBOARD DATA:");
  console.log("   - VIP Loyalty Points: 1,250 points");
  console.log("   - Total Orders:       5 orders (In-Transit, Delivered, Processing, Return Claim)");
  console.log("   - Wishlist Items:     4 items (Ready for swipe-to-delete test)");
  console.log("   - Saved Addresses:    2 (Banani Dhaka & GEC Chattogram)");
  console.log("   - Active Coupons:     VIP15, MINSAH150, FREESHIP, WELCOME10");
  console.log("");
  console.log("🚀 READY FOR USER JOURNEY TESTING!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
