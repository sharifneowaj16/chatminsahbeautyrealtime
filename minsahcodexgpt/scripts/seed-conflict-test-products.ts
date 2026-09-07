import 'dotenv/config';
import prisma from '../lib/prisma';

async function main() {
  console.log('🌱 Seeding 2 conflict-testing dummy products with rich variants...');

  // Find or create Category
  let category = await prisma.category.findFirst({
    where: { isActive: true },
  });
  if (!category) {
    category = await prisma.category.create({
      data: {
        name: 'Skincare',
        slug: 'skincare',
        description: 'Premium Skincare Collection',
        isActive: true,
      },
    });
  }

  // Find or create Brand
  let brand = await prisma.brand.findFirst({
    where: { isActive: true },
  });
  if (!brand) {
    brand = await prisma.brand.create({
      data: {
        name: 'Seed Skincare',
        slug: 'seed-skincare',
        description: 'Clean Botanical Formulations',
        isActive: true,
      },
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 1. PRODUCT 1: FREE DELIVERY OFFER (৳650 base - under ৳1,100 threshold)
  // ──────────────────────────────────────────────────────────────────────────
  const p1Sku = 'TEST-SEED-FREE-01';
  const p1Slug = 'seed-glow-daily-essence';

  const product1 = await prisma.product.upsert({
    where: { sku: p1Sku },
    update: {
      name: 'Seed Glow Daily Essence (Free Delivery Offer)',
      slug: p1Slug,
      price: 650,
      compareAtPrice: 850,
      costPrice: 400,
      quantity: 100,
      weight: 0.2,
      shippingWeight: '0.2',
      isActive: true,
      deletedAt: null,
      deliveryOfferEnabled: true,
      deliveryOfferType: 'FREE',
      deliveryOfferBadgeText: 'ফ্রি ডেলিভারি অফার',
      shortDescription: 'Clinically proven daily glow essence with active free shipping perk.',
      description: 'A luxurious bi-phase essence designed to deliver intense hydration and barrier support with complimentary free delivery nationwide.',
      categoryId: category.id,
      brandId: brand.id,
    },
    create: {
      sku: p1Sku,
      name: 'Seed Glow Daily Essence (Free Delivery Offer)',
      slug: p1Slug,
      price: 650,
      compareAtPrice: 850,
      costPrice: 400,
      quantity: 100,
      weight: 0.2,
      shippingWeight: '0.2',
      isActive: true,
      deletedAt: null,
      deliveryOfferEnabled: true,
      deliveryOfferType: 'FREE',
      deliveryOfferBadgeText: 'ফ্রি ডেলিভারি অফার',
      shortDescription: 'Clinically proven daily glow essence with active free shipping perk.',
      description: 'A luxurious bi-phase essence designed to deliver intense hydration and barrier support with complimentary free delivery nationwide.',
      categoryId: category.id,
      brandId: brand.id,
    },
  });

  // Clear existing images & variants for clean idempotent seed
  await prisma.productImage.deleteMany({ where: { productId: product1.id } });
  await prisma.productVariant.deleteMany({ where: { productId: product1.id } });

  // Add Product 1 Primary Images
  await prisma.productImage.createMany({
    data: [
      {
        productId: product1.id,
        url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&auto=format&fit=crop&q=80',
        alt: 'Seed Glow Daily Essence 30ml',
        isDefault: true,
        sortOrder: 0,
      },
      {
        productId: product1.id,
        url: 'https://images.unsplash.com/photo-1608248597359-0a56e7924c52?w=800&auto=format&fit=crop&q=80',
        alt: 'Seed Glow Daily Essence 50ml',
        isDefault: false,
        sortOrder: 1,
      },
    ],
  });

  // Add Product 1 Variants (Size + Shade + Weight)
  await prisma.productVariant.createMany({
    data: [
      {
        productId: product1.id,
        sku: 'TEST-SEED-FREE-01-30ML-21',
        name: '30ml / #21 Light Beige',
        price: 650,
        salePrice: 650,
        quantity: 50,
        isActive: true,
        image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&auto=format&fit=crop&q=80',
        attributes: {
          size: '30ml',
          shade: '#21 Light Beige',
          color: 'Beige',
          weightKg: '0.15',
        },
      },
      {
        productId: product1.id,
        sku: 'TEST-SEED-FREE-01-50ML-23',
        name: '50ml / #23 Natural Sand',
        price: 850,
        salePrice: 850,
        quantity: 30,
        isActive: true,
        image: 'https://images.unsplash.com/photo-1608248597359-0a56e7924c52?w=800&auto=format&fit=crop&q=80',
        attributes: {
          size: '50ml',
          shade: '#23 Natural Sand',
          color: 'Natural Sand',
          weightKg: '0.25',
        },
      },
      {
        productId: product1.id,
        sku: 'TEST-SEED-FREE-01-100ML-25',
        name: '100ml / #25 Warm Honey',
        price: 1250,
        salePrice: 1250,
        quantity: 20,
        isActive: true,
        image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80',
        attributes: {
          size: '100ml',
          shade: '#25 Warm Honey',
          color: 'Warm Honey',
          weightKg: '0.45',
        },
      },
    ],
  });

  console.log(`✅ Created Product 1: ${product1.name} (ID: ${product1.id}, Slug: ${product1.slug})`);

  // ──────────────────────────────────────────────────────────────────────────
  // 2. PRODUCT 2: STANDARD DELIVERY (৳550 base - requires ৳1,100 threshold)
  // ──────────────────────────────────────────────────────────────────────────
  const p2Sku = 'TEST-SEED-STD-02';
  const p2Slug = 'seed-barrier-moisture-cream';

  const product2 = await prisma.product.upsert({
    where: { sku: p2Sku },
    update: {
      name: 'Seed Barrier Moisture Cream (Standard Delivery)',
      slug: p2Slug,
      price: 550,
      compareAtPrice: 750,
      costPrice: 350,
      quantity: 100,
      weight: 0.15,
      shippingWeight: '0.15',
      isActive: true,
      deletedAt: null,
      deliveryOfferEnabled: false,
      deliveryOfferType: 'DEFAULT',
      deliveryOfferBadgeText: null,
      shortDescription: 'Deep hydration barrier cream for all-day moisture lock.',
      description: 'Formulated with ceramides and centella to restore and nourish compromised skin barriers.',
      categoryId: category.id,
      brandId: brand.id,
    },
    create: {
      sku: p2Sku,
      name: 'Seed Barrier Moisture Cream (Standard Delivery)',
      slug: p2Slug,
      price: 550,
      compareAtPrice: 750,
      costPrice: 350,
      quantity: 100,
      weight: 0.15,
      shippingWeight: '0.15',
      isActive: true,
      deletedAt: null,
      deliveryOfferEnabled: false,
      deliveryOfferType: 'DEFAULT',
      deliveryOfferBadgeText: null,
      shortDescription: 'Deep hydration barrier cream for all-day moisture lock.',
      description: 'Formulated with ceramides and centella to restore and nourish compromised skin barriers.',
      categoryId: category.id,
      brandId: brand.id,
    },
  });

  // Clear existing images & variants for Product 2
  await prisma.productImage.deleteMany({ where: { productId: product2.id } });
  await prisma.productVariant.deleteMany({ where: { productId: product2.id } });

  // Add Product 2 Primary Images
  await prisma.productImage.createMany({
    data: [
      {
        productId: product2.id,
        url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&auto=format&fit=crop&q=80',
        alt: 'Seed Barrier Moisture Cream 30g',
        isDefault: true,
        sortOrder: 0,
      },
      {
        productId: product2.id,
        url: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800&auto=format&fit=crop&q=80',
        alt: 'Seed Barrier Moisture Cream 60g',
        isDefault: false,
        sortOrder: 1,
      },
    ],
  });

  // Add Product 2 Variants (Size + Shade/Tint + Weight)
  await prisma.productVariant.createMany({
    data: [
      {
        productId: product2.id,
        sku: 'TEST-SEED-STD-02-30G-ROSE',
        name: '30g / Rose Glow',
        price: 550,
        salePrice: 550,
        quantity: 40,
        isActive: true,
        image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&auto=format&fit=crop&q=80',
        attributes: {
          size: '30g',
          shade: 'Rose Glow',
          color: 'Rose',
          weightKg: '0.10',
        },
      },
      {
        productId: product2.id,
        sku: 'TEST-SEED-STD-02-60G-CLEAR',
        name: '60g / Dewy Clear',
        price: 850,
        salePrice: 850,
        quantity: 25,
        isActive: true,
        image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800&auto=format&fit=crop&q=80',
        attributes: {
          size: '60g',
          shade: 'Dewy Clear',
          color: 'Clear',
          weightKg: '0.20',
        },
      },
    ],
  });

  console.log(`✅ Created Product 2: ${product2.name} (ID: ${product2.id}, Slug: ${product2.slug})`);

  // Connect them as Frequently Bought Together
  await prisma.product.update({
    where: { id: product1.id },
    data: {
      relatedProducts: JSON.stringify([product2.id]),
    },
  });

  await prisma.product.update({
    where: { id: product2.id },
    data: {
      relatedProducts: JSON.stringify([product1.id]),
    },
  });

  console.log('🎉 Successfully seeded both test products and cross-linked them!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
