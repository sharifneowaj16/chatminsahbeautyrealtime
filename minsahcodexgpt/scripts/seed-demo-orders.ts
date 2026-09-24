import "dotenv/config";
import prisma from "../lib/prisma";
import { Prisma, $Enums } from "../generated/prisma/client";

async function main() {
  console.log("🚀 Starting seeding 5 demo orders...");

  // Find any existing products to link, or fall back to null
  const sampleProducts = await prisma.product.findMany({
    take: 5,
    include: { images: true },
  });
  console.log(`📦 Found ${sampleProducts.length} sample products.`);

  const demoOrdersData = [
    {
      // 1. bkash paid
      orderNumber: "MB-260924-001",
      customer: {
        firstName: "Sadia",
        lastName: "Rahman",
        email: "sadia.rahman@example.com",
        phone: "01711234567",
      },
      address: {
        firstName: "Sadia",
        lastName: "Rahman",
        street1: "House 42, Road 8/A, Dhanmondi",
        city: "Dhaka",
        state: "Dhaka",
        postalCode: "1209",
        phone: "01711234567",
      },
      items: [
        {
          name: sampleProducts[0]?.name || "Minsah Beauty Radiance Glow Serum 30ml",
          sku: sampleProducts[0]?.sku || "MB-SERUM-001",
          price: 1650,
          quantity: 1,
          productId: sampleProducts[0]?.id || null,
        },
        {
          name: sampleProducts[1]?.name || "Velvet Matte Liquid Lipstick - Ruby Rose",
          sku: sampleProducts[1]?.sku || "MB-LIP-002",
          price: 850,
          quantity: 1,
          productId: sampleProducts[1]?.id || null,
        },
      ],
      shippingCost: 0,
      status: $Enums.OrderStatus.DELIVERED,
      paymentStatus: $Enums.PaymentStatus.COMPLETED,
      paymentMethod: "bkash",
      shippingMethod: "steadfast",
      steadfastTrackingCode: "STEAD-884920",
      steadfastConsignmentId: "CID-99120",
      steadfastStatus: "delivered",
      paidAt: new Date(Date.now() - 3600000 * 24 * 2),
      shippedAt: new Date(Date.now() - 3600000 * 24),
      deliveredAt: new Date(Date.now() - 3600000 * 4),
      createdAt: new Date(Date.now() - 3600000 * 24 * 2),
      transactionId: "BKASH-TXN-9A82F1",
    },
    {
      // 2. pending
      orderNumber: "MB-260924-002",
      customer: {
        firstName: "Farhana",
        lastName: "Chowdhury",
        email: "farhana.c@example.com",
        phone: "01822345678",
      },
      address: {
        firstName: "Farhana",
        lastName: "Chowdhury",
        street1: "Flat 4B, Hill View R/A, GEC Circle",
        city: "Chattogram",
        state: "Chattogram",
        postalCode: "4000",
        phone: "01822345678",
      },
      items: [
        {
          name: sampleProducts[2]?.name || "Hydrating Rose Water Facial Toner 200ml",
          sku: sampleProducts[2]?.sku || "MB-TONER-003",
          price: 950,
          quantity: 1,
          productId: sampleProducts[2]?.id || null,
        },
      ],
      shippingCost: 60,
      status: $Enums.OrderStatus.PENDING,
      paymentStatus: $Enums.PaymentStatus.PENDING,
      paymentMethod: "bkash",
      shippingMethod: "steadfast",
      createdAt: new Date(Date.now() - 3600000 * 3), // 3 hours ago
    },
    {
      // 3. cod
      orderNumber: "MB-260924-003",
      customer: {
        firstName: "Tanvir",
        lastName: "Ahmed",
        email: "tanvir.ahmed@example.com",
        phone: "01933456789",
      },
      address: {
        firstName: "Tanvir",
        lastName: "Ahmed",
        street1: "House 15, Amberkhana Main Road",
        city: "Sylhet",
        state: "Sylhet",
        postalCode: "3100",
        phone: "01933456789",
      },
      items: [
        {
          name: sampleProducts[3]?.name || "Daily UV Defense Sunscreen SPF 50+ 50ml",
          sku: sampleProducts[3]?.sku || "MB-SUN-004",
          price: 1100,
          quantity: 2,
          productId: sampleProducts[3]?.id || null,
        },
        {
          name: sampleProducts[0]?.name || "Gentle Purifying Foaming Cleanser 150ml",
          sku: "MB-CLEAN-005",
          price: 750,
          quantity: 1,
          productId: sampleProducts[0]?.id || null,
        },
      ],
      shippingCost: 120,
      courierDeliveryCharge: 120,
      status: $Enums.OrderStatus.CONFIRMED,
      paymentStatus: $Enums.PaymentStatus.PENDING,
      paymentMethod: "cash_on_delivery",
      shippingMethod: "steadfast",
      steadfastTrackingCode: "STEAD-773192",
      steadfastConsignmentId: "CONS-77319",
      steadfastStatus: "in_review",
      createdAt: new Date(Date.now() - 3600000 * 8), // 8 hours ago
    },
    {
      // 4. processing
      orderNumber: "MB-260924-004",
      customer: {
        firstName: "Nusrat",
        lastName: "Jahan",
        email: "nusrat.jahan@example.com",
        phone: "01644567890",
      },
      address: {
        firstName: "Nusrat",
        lastName: "Jahan",
        street1: "Holding 112, Shaheb Bazar",
        city: "Rajshahi",
        state: "Rajshahi",
        postalCode: "6000",
        phone: "01644567890",
      },
      items: [
        {
          name: sampleProducts[1]?.name || "Overnight Repair Night Cream 50g",
          sku: "MB-CREAM-006",
          price: 1850,
          quantity: 1,
          productId: sampleProducts[1]?.id || null,
        },
        {
          name: "Vitamin C Brightening Sheet Mask (Pack of 5)",
          sku: "MB-MASK-007",
          price: 650,
          quantity: 1,
          productId: null,
        },
      ],
      shippingCost: 0,
      deliveryDiscountAmount: 60,
      status: $Enums.OrderStatus.PROCESSING,
      paymentStatus: $Enums.PaymentStatus.COMPLETED,
      paymentMethod: "bkash",
      shippingMethod: "pathao",
      pathaoStatus: "in_transit",
      pathaoConsignmentId: "PATHAO-66219",
      pathaoTrackingCode: "PAT-991823",
      paidAt: new Date(Date.now() - 3600000 * 14),
      createdAt: new Date(Date.now() - 3600000 * 16),
      transactionId: "BKASH-TXN-4B11E9",
    },
    {
      // 5. canceled
      orderNumber: "MB-260924-005",
      customer: {
        firstName: "Mahmudul",
        lastName: "Hasan",
        email: "m.hasan.bd@example.com",
        phone: "01555678901",
      },
      address: {
        firstName: "Mahmudul",
        lastName: "Hasan",
        street1: "Road 3, Block B, Sonadanga R/A",
        city: "Khulna",
        state: "Khulna",
        postalCode: "9000",
        phone: "01555678901",
      },
      items: [
        {
          name: "Oil Control Matte Compact Powder - Natural Beige",
          sku: "MB-POWDER-008",
          price: 850,
          quantity: 1,
          productId: null,
        },
      ],
      shippingCost: 120,
      status: $Enums.OrderStatus.CANCELLED,
      paymentStatus: $Enums.PaymentStatus.CANCELLED,
      paymentMethod: "cash_on_delivery",
      cancelledAt: new Date(Date.now() - 3600000 * 5),
      adminNote: "Customer called to cancel order due to duplicate purchase.",
      createdAt: new Date(Date.now() - 3600000 * 20),
    },
  ];

  for (const data of demoOrdersData) {
    // 1. Create or upsert user
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

    // 2. Create address
    const address = await prisma.address.create({
      data: {
        userId: user.id,
        firstName: data.address.firstName,
        lastName: data.address.lastName,
        street1: data.address.street1,
        city: data.address.city,
        state: data.address.state,
        postalCode: data.address.postalCode,
        phone: data.address.phone,
      },
    });

    // 3. Compute totals
    const subtotal = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const total = subtotal + data.shippingCost;

    // 4. Delete existing demo order if already exists
    await prisma.order.deleteMany({
      where: { orderNumber: data.orderNumber },
    });

    // 5. Create Order
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
        courierDeliveryCharge: data.courierDeliveryCharge !== undefined ? new Prisma.Decimal(data.courierDeliveryCharge) : null,
        deliveryDiscountAmount: data.deliveryDiscountAmount !== undefined ? new Prisma.Decimal(data.deliveryDiscountAmount) : new Prisma.Decimal(0),
        total: new Prisma.Decimal(total),
        shippingMethod: data.shippingMethod || null,
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
                },
              ],
            }
          : undefined,
      },
    });

    console.log(`✅ Created Order #${order.orderNumber} (${data.status}, ${data.paymentMethod}, ${data.paymentStatus}) - Total: ৳${total}`);
  }

  console.log("🎉 Successfully created all 5 demo orders!");
}

main()
  .catch((err) => {
    console.error("❌ Seeding error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
