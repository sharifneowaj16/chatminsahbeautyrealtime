import "dotenv/config";
import prisma from "../lib/prisma";
import { Prisma, $Enums } from "../generated/prisma/client";

async function main() {
  console.log("🚀 Starting comprehensive demo orders seed (7 Stitch-aligned orders)...");

  // Find sample products to link real images/SKUs if available
  const sampleProducts = await prisma.product.findMany({
    take: 10,
    include: { images: true },
  });
  console.log(`📦 Found ${sampleProducts.length} sample products in database.`);

  const getProductImage = (index: number, fallback: string) => {
    return sampleProducts[index]?.images?.[0]?.url || fallback;
  };

  const demoOrdersData = [
    {
      // ── Order 1: Ultimate Stitch Demo (bKash Paid, Steadfast Shipped) ──
      orderNumber: "ORD-98214472",
      customer: {
        firstName: "Ayesha",
        lastName: "Siddiqua",
        email: "ayesha.s@example.com",
        phone: "01712-345678",
      },
      address: {
        firstName: "Ayesha",
        lastName: "Siddiqua",
        street1: "House 42, Road 11, Sector 4",
        street2: "Uttara",
        city: "Dhaka",
        state: "Dhaka",
        postalCode: "1230",
        phone: "01712-345678",
      },
      items: [
        {
          name: sampleProducts[0]?.name || "Radiance Glow Vitamin C Serum 30ml",
          sku: sampleProducts[0]?.sku || "MB-SERUM-001",
          price: 1650,
          quantity: 1,
          productId: sampleProducts[0]?.id || null,
        },
        {
          name: sampleProducts[1]?.name || "Hydrating Rose Water Facial Toner 200ml",
          sku: sampleProducts[1]?.sku || "MB-TONER-003",
          price: 950,
          quantity: 1,
          productId: sampleProducts[1]?.id || null,
        },
      ],
      shippingCost: 60,
      courierDeliveryCharge: 70, // Store subsidy = 60 - 70 = -10 (Absorbed)
      deliveryDiscountAmount: 0,
      status: $Enums.OrderStatus.SHIPPED,
      paymentStatus: $Enums.PaymentStatus.COMPLETED,
      paymentMethod: "bkash",
      shippingMethod: "steadfast",
      steadfastTrackingCode: "STEAD-992144",
      steadfastConsignmentId: "CID-88219",
      steadfastStatus: "in_transit",
      paidAt: new Date(Date.now() - 3600000 * 24 * 2), // 2 days ago
      shippedAt: new Date(Date.now() - 3600000 * 18),
      createdAt: new Date(Date.now() - 3600000 * 24 * 2),
      transactionId: "BK-8930219",
      adminNote: "Fragile packaging verified. Dispatched via Steadfast Express Uttara Hub.",
    },
    {
      // ── Order 2: Pathao Courier in Transit + Multi-Item Free Delivery ──
      orderNumber: "ORD-87123901",
      customer: {
        firstName: "Tanvir",
        lastName: "Ahmed",
        email: "tanvir.ahmed@example.com",
        phone: "01833-998877",
      },
      address: {
        firstName: "Tanvir",
        lastName: "Ahmed",
        street1: "Flat 5A, Green Heritage",
        street2: "GEC Circle",
        city: "Chattogram",
        state: "Chattogram",
        postalCode: "4000",
        phone: "01833-998877",
      },
      items: [
        {
          name: sampleProducts[2]?.name || "Daily UV Defense Sunscreen SPF 50+ 50ml",
          sku: sampleProducts[2]?.sku || "MB-SUN-004",
          price: 1100,
          quantity: 2,
          productId: sampleProducts[2]?.id || null,
        },
        {
          name: sampleProducts[3]?.name || "Gentle Purifying Foaming Cleanser 150ml",
          sku: "MB-CLEAN-005",
          price: 750,
          quantity: 1,
          productId: sampleProducts[3]?.id || null,
        },
        {
          name: "Vitamin C Brightening Sheet Mask (Pack of 5)",
          sku: "MB-MASK-007",
          price: 650,
          quantity: 1,
          productId: null,
        },
      ],
      shippingCost: 0, // Free Delivery
      courierDeliveryCharge: 120, // Store subsidy = 0 - 120 = -120 (Absorbed)
      deliveryDiscountAmount: 120,
      deliveryPricingSource: "PROMO_CAMPAIGN" as any,
      deliveryOfferType: "FREE_SHIPPING" as any,
      deliveryOfferBadgeText: "Free Delivery Active",
      status: $Enums.OrderStatus.PROCESSING,
      paymentStatus: $Enums.PaymentStatus.COMPLETED,
      paymentMethod: "bkash",
      shippingMethod: "pathao",
      pathaoStatus: "in_transit",
      pathaoConsignmentId: "PATHAO-77120",
      pathaoTrackingCode: "PAT-881923",
      paidAt: new Date(Date.now() - 3600000 * 12),
      createdAt: new Date(Date.now() - 3600000 * 14),
      transactionId: "BK-4419208",
      adminNote: "Customer qualified for VIP Free Shipping promotion. Dispatched via Pathao parcel.",
    },
    {
      // ── Order 3: COD + Steadfast Delivery Surplus (Profit) ──
      orderNumber: "ORD-76120934",
      customer: {
        firstName: "Nusrat",
        lastName: "Jahan",
        email: "nusrat.j@example.com",
        phone: "01911-554433",
      },
      address: {
        firstName: "Nusrat",
        lastName: "Jahan",
        street1: "Holding 112, Shaheb Bazar",
        city: "Rajshahi",
        state: "Rajshahi",
        postalCode: "6000",
        phone: "01911-554433",
      },
      items: [
        {
          name: sampleProducts[4]?.name || "Overnight Repair Night Cream 50g",
          sku: "MB-CREAM-006",
          price: 1850,
          quantity: 1,
          productId: sampleProducts[4]?.id || null,
        },
      ],
      shippingCost: 120, // Customer paid 120
      courierDeliveryCharge: 100, // Courier actual charge 100 -> Store profit = +20 Surplus
      status: $Enums.OrderStatus.PROCESSING,
      paymentStatus: $Enums.PaymentStatus.PENDING,
      paymentMethod: "cash_on_delivery",
      shippingMethod: "steadfast",
      steadfastTrackingCode: "STEAD-773192",
      steadfastConsignmentId: "CONS-66120",
      steadfastStatus: "in_review",
      createdAt: new Date(Date.now() - 3600000 * 6),
      adminNote: "COD confirmed via phone call. Ready for evening courier pickup.",
    },
    {
      // ── Order 4: Unassigned Courier (Awaiting Dispatch Assignment) ──
      orderNumber: "ORD-65412890",
      customer: {
        firstName: "Farhana",
        lastName: "Chowdhury",
        email: "farhana.c@example.com",
        phone: "01622-443322",
      },
      address: {
        firstName: "Farhana",
        lastName: "Chowdhury",
        street1: "House 15, Amberkhana Main Road",
        city: "Sylhet",
        state: "Sylhet",
        postalCode: "3100",
        phone: "01622-443322",
      },
      items: [
        {
          name: "Velvet Matte Liquid Lipstick - Ruby Rose",
          sku: "MB-LIP-002",
          price: 850,
          quantity: 2,
          productId: null,
        },
      ],
      shippingCost: 120,
      status: $Enums.OrderStatus.PENDING,
      paymentStatus: $Enums.PaymentStatus.PENDING,
      paymentMethod: "cash_on_delivery",
      shippingMethod: "steadfast",
      createdAt: new Date(Date.now() - 3600000 * 2), // 2 hours ago
      adminNote: "New order. Awaiting staff phone confirmation before dispatch.",
    },
    {
      // ── Order 5: Delivered & POD Verified (Full Historical Timeline) ──
      orderNumber: "ORD-54301982",
      customer: {
        firstName: "Sadia",
        lastName: "Rahman",
        email: "sadia.r@example.com",
        phone: "01711-234567",
      },
      address: {
        firstName: "Sadia",
        lastName: "Rahman",
        street1: "Road 3, Block B, Sonadanga R/A",
        city: "Khulna",
        state: "Khulna",
        postalCode: "9000",
        phone: "01711-234567",
      },
      items: [
        {
          name: "Hydrating Rose Water Facial Toner 200ml",
          sku: "MB-TONER-003",
          price: 950,
          quantity: 1,
          productId: null,
        },
        {
          name: "Oil Control Matte Compact Powder - Natural Beige",
          sku: "MB-POWDER-008",
          price: 850,
          quantity: 1,
          productId: null,
        },
      ],
      shippingCost: 60,
      courierDeliveryCharge: 60,
      status: $Enums.OrderStatus.DELIVERED,
      paymentStatus: $Enums.PaymentStatus.COMPLETED,
      paymentMethod: "bkash",
      shippingMethod: "steadfast",
      steadfastTrackingCode: "STEAD-551920",
      steadfastConsignmentId: "CID-55192",
      steadfastStatus: "delivered",
      paidAt: new Date(Date.now() - 3600000 * 48),
      shippedAt: new Date(Date.now() - 3600000 * 30),
      deliveredAt: new Date(Date.now() - 3600000 * 5),
      createdAt: new Date(Date.now() - 3600000 * 48),
      transactionId: "BK-7719203",
      adminNote: "Delivered on time. Customer rated 5 stars for packaging.",
    },
    {
      // ── Order 6: Cancelled Order with Staff Audit Call Log ──
      orderNumber: "ORD-43219087",
      customer: {
        firstName: "Mahmudul",
        lastName: "Hasan",
        email: "m.hasan@example.com",
        phone: "01555-678901",
      },
      address: {
        firstName: "Mahmudul",
        lastName: "Hasan",
        street1: "Holding 44, Station Road",
        city: "Mymensingh",
        state: "Mymensingh",
        postalCode: "2200",
        phone: "01555-678901",
      },
      items: [
        {
          name: "Gentle Purifying Foaming Cleanser 150ml",
          sku: "MB-CLEAN-005",
          price: 750,
          quantity: 1,
          productId: null,
        },
      ],
      shippingCost: 60,
      status: $Enums.OrderStatus.CANCELLED,
      paymentStatus: $Enums.PaymentStatus.CANCELLED,
      paymentMethod: "cash_on_delivery",
      cancelledAt: new Date(Date.now() - 3600000 * 8),
      createdAt: new Date(Date.now() - 3600000 * 26),
      adminNote: "[Call Log] Customer requested cancellation due to duplicate order placed from another browser.",
    },
    {
      // ── Order 7: VIP Customer with Promo Coupon Discount ──
      orderNumber: "ORD-32109876",
      customer: {
        firstName: "Dr. Sabrina",
        lastName: "Karim",
        email: "dr.sabrina@example.com",
        phone: "01788-990011",
      },
      address: {
        firstName: "Dr. Sabrina",
        lastName: "Karim",
        street1: "Apartment 7C, Concord Royal",
        street2: "Road 104, Gulshan-2",
        city: "Dhaka",
        state: "Dhaka",
        postalCode: "1212",
        phone: "01788-990011",
      },
      items: [
        {
          name: "Radiance Glow Vitamin C Serum 30ml",
          sku: "MB-SERUM-001",
          price: 1650,
          quantity: 2,
          productId: null,
        },
        {
          name: "Overnight Repair Night Cream 50g",
          sku: "MB-CREAM-006",
          price: 1850,
          quantity: 1,
          productId: null,
        },
        {
          name: "Daily UV Defense Sunscreen SPF 50+ 50ml",
          sku: "MB-SUN-004",
          price: 1100,
          quantity: 1,
          productId: null,
        },
      ],
      shippingCost: 0,
      courierDeliveryCharge: 70,
      discountAmount: 500, // Coupon discount
      couponCode: "VIP2026",
      couponDiscount: 500,
      status: $Enums.OrderStatus.PROCESSING,
      paymentStatus: $Enums.PaymentStatus.COMPLETED,
      paymentMethod: "bkash",
      shippingMethod: "steadfast",
      steadfastTrackingCode: "STEAD-321098",
      steadfastConsignmentId: "CID-32109",
      steadfastStatus: "in_transit",
      paidAt: new Date(Date.now() - 3600000 * 10),
      createdAt: new Date(Date.now() - 3600000 * 11),
      transactionId: "BK-9921447",
      adminNote: "VIP Tier Platinum Member. Complimentary beauty samples included.",
    },
  ];

  console.log(`🧹 Cleaning existing demo orders (${demoOrdersData.map((d) => d.orderNumber).join(", ")})...`);
  for (const data of demoOrdersData) {
    await prisma.order.deleteMany({
      where: { orderNumber: data.orderNumber },
    });
  }

  console.log("🌱 Inserting 7 rich demo orders...");
  for (const data of demoOrdersData) {
    // 1. Upsert customer User
    const user = await prisma.user.upsert({
      where: { email: data.customer.email },
      update: {
        firstName: data.customer.firstName,
        lastName: data.customer.lastName,
        phone: data.customer.phone,
      },
      create: {
        email: data.customer.email,
        firstName: data.customer.firstName,
        lastName: data.customer.lastName,
        phone: data.customer.phone,
      },
    });

    // 2. Create Address
    const address = await prisma.address.create({
      data: {
        userId: user.id,
        firstName: data.address.firstName,
        lastName: data.address.lastName,
        street1: data.address.street1,
        street2: data.address.street2 || null,
        city: data.address.city,
        state: data.address.state,
        postalCode: data.address.postalCode,
        country: "Bangladesh",
        phone: data.address.phone,
      },
    });

    // 3. Compute Totals
    const subtotal = data.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const discount = data.discountAmount || 0;
    const total = Math.max(0, subtotal - discount + data.shippingCost);

    // 4. Create Order
    const order = await prisma.order.create({
      data: {
        orderNumber: data.orderNumber,
        userId: user.id,
        addressId: address.id,
        status: data.status,
        paymentStatus: data.paymentStatus,
        paymentMethod: data.paymentMethod,
        subtotal: new Prisma.Decimal(subtotal),
        shippingCost: new Prisma.Decimal(data.shippingCost),
        courierDeliveryCharge:
          data.courierDeliveryCharge !== undefined
            ? new Prisma.Decimal(data.courierDeliveryCharge)
            : null,
        deliveryDiscountAmount:
          data.deliveryDiscountAmount !== undefined
            ? new Prisma.Decimal(data.deliveryDiscountAmount)
            : new Prisma.Decimal(0),
        discountAmount: new Prisma.Decimal(discount),
        couponCode: data.couponCode || null,
        couponDiscount: data.couponDiscount ? new Prisma.Decimal(data.couponDiscount) : null,
        total: new Prisma.Decimal(total),
        shippingMethod: data.shippingMethod || null,
        trackingNumber: data.steadfastTrackingCode || data.pathaoTrackingCode || null,
        steadfastTrackingCode: data.steadfastTrackingCode || null,
        steadfastConsignmentId: data.steadfastConsignmentId || null,
        steadfastStatus: data.steadfastStatus || null,
        pathaoStatus: data.pathaoStatus || null,
        pathaoConsignmentId: data.pathaoConsignmentId || null,
        pathaoTrackingCode: data.pathaoTrackingCode || null,
        paidAt: data.paidAt || null,
        shippedAt: data.shippedAt || null,
        deliveredAt: data.deliveredAt || null,
        cancelledAt: data.cancelledAt || null,
        adminNote: data.adminNote || null,
        createdAt: data.createdAt,
        updatedAt: new Date(),
        items: {
          create: data.items.map((item) => ({
            name: item.name,
            sku: item.sku,
            price: new Prisma.Decimal(item.price),
            quantity: item.quantity,
            total: new Prisma.Decimal(item.price * item.quantity),
            productId: item.productId,
          })),
        },
        payments: data.transactionId
          ? {
              create: [
                {
                  method: data.paymentMethod,
                  status: data.paymentStatus,
                  amount: new Prisma.Decimal(total),
                  currency: "BDT",
                  transactionId: data.transactionId,
                  gatewayTransactionId: `GW-${data.transactionId}`,
                  rawStatus: data.paymentStatus === $Enums.PaymentStatus.COMPLETED ? "0000" : "0100",
                },
              ],
            }
          : undefined,
      },
    });

    console.log(
      `  ✓ #${order.orderNumber} | Customer: ${data.customer.firstName} | ${data.status} | Total: ৳${total}`,
    );
  }

  console.log("🎉 Successfully seeded 7 comprehensive demo orders!");
}

main()
  .catch((err) => {
    console.error("❌ Seeding error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
