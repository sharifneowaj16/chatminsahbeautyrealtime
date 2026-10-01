import "dotenv/config";
import prisma from "../lib/prisma";
import { Prisma } from "../generated/prisma/client";

async function main() {
  console.log("🚀 Starting Inventory, Shortlist, Supplier, and Purchase Order Seed...");

  // 1. Verify Admin User
  const admin = await prisma.adminUser.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });

  if (!admin) {
    console.warn("⚠️ No active admin user found. Creating fallback admin user...");
  }
  const adminId = admin?.id || null;

  // 2. Fetch existing products
  const products = await prisma.product.findMany({
    select: {
      id: true,
      sku: true,
      name: true,
      price: true,
      costPrice: true,
      quantity: true,
      lowStockThreshold: true,
    },
  });

  if (products.length === 0) {
    console.error("❌ No products found in database! Please run `npm run db:seed` first.");
    process.exit(1);
  }

  console.log(`📦 Found ${products.length} products in database.`);

  const findProduct = (skuSub: string) =>
    products.find((p) => p.sku.toLowerCase().includes(skuSub.toLowerCase())) || products[0];

  const serumProduct = findProduct("MSB-SKN-001");
  const vitcCreamProduct = findProduct("MSB-SKN-002");
  const cleanserProduct = findProduct("MSB-SKN-003");
  const mascaraProduct = findProduct("MAY-EYE-001");
  const lipstickProduct = findProduct("REV-LIPS-001");
  const matteInkProduct = findProduct("MAY-LIPS-001");
  const garnierSerum = findProduct("GAR-SKIN-001");
  const foundationProduct = findProduct("LOR-FACE-001");
  const micellarProduct = findProduct("GAR-SKIN-002");

  // ==========================================
  // 3. Seed Suppliers
  // ==========================================
  console.log("🏢 Seeding Suppliers...");

  const suppliersData = [
    {
      code: "SUP-DHK-001",
      name: "Dhaka Cosmetics Importers Ltd.",
      contactPerson: "Al-Amin Hossain",
      email: "sales@dhakacosmetics.com",
      phone: "+8801711223344",
      address: "Plot 14, Chawkbazar Wholesale Market, Old Dhaka",
      paymentTerms: "Net 15 Days",
      notes: "Authorized regional distributor for skincare & body serums.",
      isActive: true,
    },
    {
      code: "SUP-KOR-002",
      name: "K-Beauty Wholesale Direct BD",
      contactPerson: "Min-jun Park / Tanvir Hasan",
      email: "orders@kbeautybd.com",
      phone: "+8801822334455",
      address: "Road 11, Banani DOHS, Dhaka",
      paymentTerms: "Net 30 Days",
      notes: "Official Korean skincare importer (COSRX, Beauty of Joseon, Laneige).",
      isActive: true,
    },
    {
      code: "SUP-GLAM-003",
      name: "Bangkok Glam Cosmetics BD",
      contactPerson: "Nusrat Jahan",
      email: "glam@bangkoksupply.bd",
      phone: "+8801933445566",
      address: "Navana Tower, Gulshan-1, Dhaka",
      paymentTerms: "50% Advance, 50% on Delivery",
      notes: "Weekly air shipments from Bangkok for premium makeup & lipsticks.",
      isActive: true,
    },
    {
      code: "SUP-LON-004",
      name: "London Beauty Hub Distribution",
      contactPerson: "Shahriar Kabir",
      email: "wholesale@londonbeautybd.com",
      phone: "+8801644556677",
      address: "Sector 7, Uttara, Dhaka",
      paymentTerms: "Net 7 Days",
      notes: "UK-imported original foundations, mascaras, and haircare.",
      isActive: true,
    },
    {
      code: "SUP-PLT-005",
      name: "Paltan Heritage Trading Co.",
      contactPerson: "Belal Hossain",
      email: "belal@paltantrading.com",
      phone: "+8801755667788",
      address: "Baitul Mukarram Market, Purana Paltan, Dhaka",
      paymentTerms: "Cash on Delivery",
      notes: "Fast local spot purchases and emergency restocks.",
      isActive: true,
    },
  ];

  const seededSuppliers = new Map<string, any>();

  for (const sup of suppliersData) {
    const s = await prisma.supplier.upsert({
      where: { code: sup.code },
      update: {
        name: sup.name,
        contactPerson: sup.contactPerson,
        email: sup.email,
        phone: sup.phone,
        address: sup.address,
        paymentTerms: sup.paymentTerms,
        notes: sup.notes,
        isActive: sup.isActive,
      },
      create: sup,
    });
    seededSuppliers.set(sup.code, s);
    console.log(`   ✅ Supplier: ${s.name} (${s.code})`);
  }

  const supDhk = seededSuppliers.get("SUP-DHK-001")!;
  const supKor = seededSuppliers.get("SUP-KOR-002")!;
  const supGlam = seededSuppliers.get("SUP-GLAM-003")!;
  const supLon = seededSuppliers.get("SUP-LON-004")!;
  const supPlt = seededSuppliers.get("SUP-PLT-005")!;

  // ==========================================
  // 4. Seed Supplier-Product Relationships
  // ==========================================
  console.log("🔗 Linking Supplier-Products...");

  const now = new Date();
  const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const supplierProductMappings = [
    // Hydrating Face Serum
    {
      supplierId: supDhk.id,
      productId: serumProduct.id,
      supplierSku: "DHK-SER-01",
      lastPurchaseRate: new Prisma.Decimal(750),
      lowestPurchaseRate: new Prisma.Decimal(720),
      lowestPurchaseRateDate: daysAgo(30),
      lastPurchasedAt: daysAgo(10),
      isPreferred: true,
    },
    {
      supplierId: supPlt.id,
      productId: serumProduct.id,
      supplierSku: "PLT-SER-99",
      lastPurchaseRate: new Prisma.Decimal(800),
      lowestPurchaseRate: new Prisma.Decimal(780),
      lowestPurchaseRateDate: daysAgo(45),
      lastPurchasedAt: daysAgo(20),
      isPreferred: false,
    },
    // Vitamin C Brightening Cream
    {
      supplierId: supKor.id,
      productId: vitcCreamProduct.id,
      supplierSku: "KOR-VITC-02",
      lastPurchaseRate: new Prisma.Decimal(560),
      lowestPurchaseRate: new Prisma.Decimal(540),
      lowestPurchaseRateDate: daysAgo(60),
      lastPurchasedAt: daysAgo(5),
      isPreferred: true,
    },
    {
      supplierId: supDhk.id,
      productId: vitcCreamProduct.id,
      supplierSku: "DHK-VITC-08",
      lastPurchaseRate: new Prisma.Decimal(610),
      lowestPurchaseRate: new Prisma.Decimal(590),
      lowestPurchaseRateDate: daysAgo(90),
      lastPurchasedAt: daysAgo(25),
      isPreferred: false,
    },
    // Gentle Foaming Cleanser
    {
      supplierId: supDhk.id,
      productId: cleanserProduct.id,
      supplierSku: "DHK-CLN-03",
      lastPurchaseRate: new Prisma.Decimal(340),
      lowestPurchaseRate: new Prisma.Decimal(320),
      lowestPurchaseRateDate: daysAgo(40),
      lastPurchasedAt: daysAgo(10),
      isPreferred: true,
    },
    {
      supplierId: supPlt.id,
      productId: cleanserProduct.id,
      supplierSku: "PLT-CLN-01",
      lastPurchaseRate: new Prisma.Decimal(360),
      lowestPurchaseRate: new Prisma.Decimal(345),
      lowestPurchaseRateDate: daysAgo(15),
      lastPurchasedAt: daysAgo(2),
      isPreferred: false,
    },
    // Maybelline Sky High Mascara
    {
      supplierId: supLon.id,
      productId: mascaraProduct.id,
      supplierSku: "LON-MAY-01",
      lastPurchaseRate: new Prisma.Decimal(680),
      lowestPurchaseRate: new Prisma.Decimal(650),
      lowestPurchaseRateDate: daysAgo(50),
      lastPurchasedAt: daysAgo(12),
      isPreferred: true,
    },
    {
      supplierId: supGlam.id,
      productId: mascaraProduct.id,
      supplierSku: "BKK-MAY-55",
      lastPurchaseRate: new Prisma.Decimal(710),
      lowestPurchaseRate: new Prisma.Decimal(690),
      lowestPurchaseRateDate: daysAgo(75),
      lastPurchasedAt: daysAgo(22),
      isPreferred: false,
    },
    // Revlon Lipstick
    {
      supplierId: supPlt.id,
      productId: lipstickProduct.id,
      supplierSku: "PLT-REV-01",
      lastPurchaseRate: new Prisma.Decimal(360),
      lowestPurchaseRate: new Prisma.Decimal(340),
      lowestPurchaseRateDate: daysAgo(60),
      lastPurchasedAt: daysAgo(8),
      isPreferred: true,
    },
    {
      supplierId: supGlam.id,
      productId: lipstickProduct.id,
      supplierSku: "BKK-REV-12",
      lastPurchaseRate: new Prisma.Decimal(380),
      lowestPurchaseRate: new Prisma.Decimal(360),
      lowestPurchaseRateDate: daysAgo(45),
      lastPurchasedAt: daysAgo(18),
      isPreferred: false,
    },
    // Maybelline SuperStay Matte Ink
    {
      supplierId: supGlam.id,
      productId: matteInkProduct.id,
      supplierSku: "BKK-MAY-LIP",
      lastPurchaseRate: new Prisma.Decimal(570),
      lowestPurchaseRate: new Prisma.Decimal(540),
      lowestPurchaseRateDate: daysAgo(35),
      lastPurchasedAt: daysAgo(1),
      isPreferred: true,
    },
    // Garnier Vitamin C Serum
    {
      supplierId: supDhk.id,
      productId: garnierSerum.id,
      supplierSku: "DHK-GAR-01",
      lastPurchaseRate: new Prisma.Decimal(410),
      lowestPurchaseRate: new Prisma.Decimal(395),
      lowestPurchaseRateDate: daysAgo(65),
      lastPurchasedAt: daysAgo(5),
      isPreferred: true,
    },
    // L'Oréal Infallible Foundation
    {
      supplierId: supLon.id,
      productId: foundationProduct.id,
      supplierSku: "LON-LOR-01",
      lastPurchaseRate: new Prisma.Decimal(1080),
      lowestPurchaseRate: new Prisma.Decimal(1040),
      lowestPurchaseRateDate: daysAgo(80),
      lastPurchasedAt: daysAgo(14),
      isPreferred: true,
    },
    // Garnier Micellar Water
    {
      supplierId: supDhk.id,
      productId: micellarProduct.id,
      supplierSku: "DHK-GAR-MIC",
      lastPurchaseRate: new Prisma.Decimal(320),
      lowestPurchaseRate: new Prisma.Decimal(310),
      lowestPurchaseRateDate: daysAgo(40),
      lastPurchasedAt: daysAgo(10),
      isPreferred: true,
    },
  ];

  for (const map of supplierProductMappings) {
    await prisma.supplierProduct.upsert({
      where: {
        supplierId_productId: {
          supplierId: map.supplierId,
          productId: map.productId,
        },
      },
      update: map,
      create: map,
    });
  }

  console.log(`   ✅ Seeded ${supplierProductMappings.length} supplier-product links.`);

  // ==========================================
  // 5. Seed Purchase Orders & Order Items
  // ==========================================
  console.log("📑 Seeding Purchase Orders...");

  const purchaseOrdersData = [
    {
      orderNumber: "PO-2026-001",
      supplierId: supDhk.id,
      status: "RECEIVED",
      orderedAt: daysAgo(14),
      receivedAt: daysAgo(10),
      subtotal: new Prisma.Decimal(47200),
      shippingCost: new Prisma.Decimal(500),
      taxAmount: new Prisma.Decimal(0),
      totalAmount: new Prisma.Decimal(47700),
      notes: "First bulk intake for monthly stock replenish. All packages verified with QA hologram.",
      items: [
        {
          productId: serumProduct.id,
          quantity: 50,
          receivedQuantity: 50,
          unitCost: new Prisma.Decimal(740),
          receivedAt: daysAgo(10),
          notes: "50 units intact with batch exp 2028/12.",
        },
        {
          productId: cleanserProduct.id,
          quantity: 30,
          receivedQuantity: 30,
          unitCost: new Prisma.Decimal(340),
          receivedAt: daysAgo(10),
          notes: "30 units cleanser received in excellent condition.",
        },
      ],
    },
    {
      orderNumber: "PO-2026-002",
      supplierId: supKor.id,
      status: "RECEIVED",
      orderedAt: daysAgo(9),
      receivedAt: daysAgo(5),
      subtotal: new Prisma.Decimal(47000),
      shippingCost: new Prisma.Decimal(800),
      taxAmount: new Prisma.Decimal(0),
      totalAmount: new Prisma.Decimal(47800),
      notes: "Received via Air Cargo Banani hub. 100% genuine sealed boxes.",
      items: [
        {
          productId: vitcCreamProduct.id,
          quantity: 40,
          receivedQuantity: 40,
          unitCost: new Prisma.Decimal(560),
          receivedAt: daysAgo(5),
          notes: "High demand brightening cream batch.",
        },
        {
          productId: garnierSerum.id,
          quantity: 60,
          receivedQuantity: 60,
          unitCost: new Prisma.Decimal(410),
          receivedAt: daysAgo(5),
          notes: "Standard retail packaging with security tags.",
        },
      ],
    },
    {
      orderNumber: "PO-2026-003",
      supplierId: supGlam.id,
      status: "PARTIALLY_RECEIVED",
      orderedAt: daysAgo(4),
      receivedAt: null,
      subtotal: new Prisma.Decimal(43100),
      shippingCost: new Prisma.Decimal(650),
      taxAmount: new Prisma.Decimal(0),
      totalAmount: new Prisma.Decimal(43750),
      notes: "Partial shipment arrived via courier. Remainder expected tomorrow afternoon.",
      items: [
        {
          productId: matteInkProduct.id,
          quantity: 50,
          receivedQuantity: 25,
          unitCost: new Prisma.Decimal(570),
          receivedAt: daysAgo(1),
          notes: "25 pcs received and added to shelf; 25 pcs in second parcel.",
        },
        {
          productId: lipstickProduct.id,
          quantity: 40,
          receivedQuantity: 0,
          unitCost: new Prisma.Decimal(365),
          receivedAt: null,
          notes: "Pending supplier stock dispatch from Bangkok cargo.",
        },
      ],
    },
    {
      orderNumber: "PO-2026-004",
      supplierId: supLon.id,
      status: "ORDERED",
      orderedAt: daysAgo(2),
      receivedAt: null,
      subtotal: new Prisma.Decimal(50450),
      shippingCost: new Prisma.Decimal(1200),
      taxAmount: new Prisma.Decimal(0),
      totalAmount: new Prisma.Decimal(51650),
      notes: "Purchase order confirmed by UK export partner. Awaiting customs clearance at HSIA.",
      items: [
        {
          productId: foundationProduct.id,
          quantity: 25,
          receivedQuantity: 0,
          unitCost: new Prisma.Decimal(1080),
          receivedAt: null,
          notes: "Infallible Fresh Wear shades assorted.",
        },
        {
          productId: mascaraProduct.id,
          quantity: 35,
          receivedQuantity: 0,
          unitCost: new Prisma.Decimal(670),
          receivedAt: null,
          notes: "Sky High Waterproof Mascara.",
        },
      ],
    },
    {
      orderNumber: "PO-2026-005",
      supplierId: supPlt.id,
      status: "DRAFT",
      orderedAt: new Date(),
      receivedAt: null,
      subtotal: new Prisma.Decimal(17250),
      shippingCost: new Prisma.Decimal(200),
      taxAmount: new Prisma.Decimal(0),
      totalAmount: new Prisma.Decimal(17450),
      notes: "Emergency stock draft order for low stock cleanser and lipstick.",
      items: [
        {
          productId: cleanserProduct.id,
          quantity: 50,
          receivedQuantity: 0,
          unitCost: new Prisma.Decimal(345),
          receivedAt: null,
          notes: "Urgent local order draft.",
        },
      ],
    },
  ];

  for (const poData of purchaseOrdersData) {
    const { items, ...poFields } = poData;

    const po = await prisma.purchaseOrder.upsert({
      where: { orderNumber: poFields.orderNumber },
      update: poFields,
      create: poFields,
    });

    // Clean existing items for this PO to ensure idempotency
    await prisma.purchaseOrderItem.deleteMany({
      where: { purchaseOrderId: po.id },
    });

    // Create fresh items
    for (const item of items) {
      await prisma.purchaseOrderItem.create({
        data: {
          purchaseOrderId: po.id,
          ...item,
        },
      });
    }

    console.log(`   ✅ PO ${po.orderNumber} (${po.status}) with ${items.length} items`);
  }

  // ==========================================
  // 6. Balance Product Inventory Statuses
  // ==========================================
  console.log("📊 Tuning Product Quantities for Status Coverage...");

  // We set specific quantities so that the dashboard shows:
  // - low_stock (quantity <= lowStockThreshold)
  // - out_of_stock (quantity === 0)
  // - in_stock (normal)
  // - overstocked (quantity > 10 * lowStockThreshold)
  const stockAdjustments = [
    { id: cleanserProduct.id, quantity: 6 }, // threshold: 15 -> low_stock
    { id: vitcCreamProduct.id, quantity: 8 }, // threshold: 10 -> low_stock
    { id: lipstickProduct.id, quantity: 0 }, // threshold: 10 -> out_of_stock
    { id: serumProduct.id, quantity: 45 }, // threshold: 10 -> in_stock
    { id: matteInkProduct.id, quantity: 40 }, // threshold: 15 -> in_stock
    { id: mascaraProduct.id, quantity: 160 }, // threshold: 12 -> overstocked (160 > 120)
    { id: micellarProduct.id, quantity: 280 }, // threshold: 5 -> overstocked (280 > 50)
  ];

  for (const adj of stockAdjustments) {
    await prisma.product.update({
      where: { id: adj.id },
      data: { quantity: adj.quantity },
    });
  }
  console.log(`   ✅ Adjusted ${stockAdjustments.length} product quantities for realistic inventory states.`);

  // ==========================================
  // 7. Seed Inventory Shortlist (for /admin/inventory shortlist tab)
  // ==========================================
  console.log("⭐ Seeding Inventory Shortlist...");

  const inventoryShortlistData = [
    {
      productId: cleanserProduct.id,
      priority: 3, // Urgent
      note: "স্টক খুবই কম (৬ পিস বাকি)। দ্রুত ৫০ পিস রিঅর্ডার করতে হবে।",
      adminId,
    },
    {
      productId: lipstickProduct.id,
      priority: 3, // Urgent
      note: "আউট অফ স্টক! কাস্টমার ডিমান্ড বেশি, পল্টন সাপ্লায়ার থেকে ২০ পিস আনতে হবে।",
      adminId,
    },
    {
      productId: vitcCreamProduct.id,
      priority: 2, // High
      note: "উইকেন্ডে বিশেষ অফার রয়েছে, স্টক শেষ হওয়ার আগেই অর্ডার দেওয়া প্রয়োজন।",
      adminId,
    },
    {
      productId: serumProduct.id,
      priority: 1, // Normal
      note: "সাপ্লায়ার এই সপ্তাহে ৫% ভলিউম ডিসকাউন্ট অফার করেছে।",
      adminId,
    },
  ];

  for (const item of inventoryShortlistData) {
    await prisma.inventoryShortlist.upsert({
      where: { productId: item.productId },
      update: {
        priority: item.priority,
        note: item.note,
        adminId: item.adminId,
      },
      create: item,
    });
    console.log(`   ✅ Inventory Shortlist: Product ID ${item.productId} (Priority: ${item.priority})`);
  }

  // ==========================================
  // 8. Seed Purchase Shortlist (for /admin/shortlist page)
  // ==========================================
  console.log("📋 Seeding Order-Linked Purchase Shortlist...");

  const orders = await prisma.order.findMany({
    take: 6,
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  if (orders.length > 0) {
    for (const order of orders) {
      for (const item of order.items) {
        if (!item.productId) continue;

        const isDelivered = order.status === "DELIVERED";
        const isProcessing = order.status === "PROCESSING" || order.status === "SHIPPED";
        const isPurchased = isDelivered || isProcessing;

        const sellPriceNum = Number(item.price) || 1000;
        const buyPriceNum = Math.round(sellPriceNum * 0.65); // 35% margin estimate

        await prisma.purchaseShortlist.upsert({
          where: {
            orderId_productId_productName: {
              orderId: order.id,
              productId: item.productId,
              productName: item.name,
            },
          },
          update: {
            productName: item.name,
            quantity: item.quantity,
            buyPrice: new Prisma.Decimal(buyPriceNum),
            sellPrice: new Prisma.Decimal(sellPriceNum),
            purchased: isPurchased,
            purchasedAt: isPurchased ? daysAgo(1) : null,
            priority: order.status === "CONFIRMED" ? "URGENT" : order.status === "PENDING" ? "HIGH" : "NORMAL",
            notes: isPurchased
              ? "সাপ্লায়ার ডেলিভারি সম্পন্ন করেছে এবং গোডাউনে রিসিভ হয়েছে।"
              : "কাস্টমার কনফার্ম করেছে, আজই লোকাল ভেন্ডর থেকে স্টক আনতে হবে।",
            adminId,
          },
          create: {
            orderId: order.id,
            productId: item.productId,
            productName: item.name,
            quantity: item.quantity,
            buyPrice: new Prisma.Decimal(buyPriceNum),
            sellPrice: new Prisma.Decimal(sellPriceNum),
            purchased: isPurchased,
            purchasedAt: isPurchased ? daysAgo(1) : null,
            priority: order.status === "CONFIRMED" ? "URGENT" : order.status === "PENDING" ? "HIGH" : "NORMAL",
            notes: isPurchased
              ? "সাপ্লায়ার ডেলিভারি সম্পন্ন করেছে এবং গোডাউনে রিসিভ হয়েছে।"
              : "কাস্টমার কনফার্ম করেছে, আজই লোকাল ভেন্ডর থেকে স্টক আনতে হবে।",
            adminId,
          },
        });
      }
    }
    console.log(`   ✅ Seeded purchase shortlist items for ${orders.length} orders.`);
  }

  console.log("\n🎉 All demo inventory, shortlist, supplier, and purchase order seeds completed successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error("❌ Error during inventory seeding:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
