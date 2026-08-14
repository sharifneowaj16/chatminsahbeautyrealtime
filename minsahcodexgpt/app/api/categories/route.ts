import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { adminHasPermission, getVerifiedAdmin } from '@/lib/auth/admin-request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toSlug(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function requireCategoryAdmin(request: NextRequest): Promise<NextResponse | null> {
  const admin = await getVerifiedAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!adminHasPermission(admin, ADMIN_PERMISSIONS.CONTENT_MANAGE)) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedInactiveCategories = searchParams.get('activeOnly') === 'false';

    if (requestedInactiveCategories) {
      const adminResponse = await requireCategoryAdmin(request);
      if (adminResponse) return adminResponse;
    }

    const activeOnly = !requestedInactiveCategories;
    const where = activeOnly ? { isActive: true, parentId: null } : { parentId: null };
    const nestedWhere = activeOnly ? { isActive: true } : undefined;

    const categories = await prisma.category.findMany({
      where,
      include: {
        children: {
          ...(nestedWhere ? { where: nestedWhere } : {}),
          include: {
            children: {
              ...(nestedWhere ? { where: nestedWhere } : {}),
              orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            },
          },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        },
        _count: {
          select: { products: true },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    const formatted = categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      href: `/shop?category=${cat.name}`,
      icon: cat.image || undefined,
      productCount: cat._count.products,
      status: cat.isActive ? 'active' : 'inactive',
      createdAt: cat.createdAt.toISOString(),
      subcategories: cat.children.map(sub => ({
        name: sub.name,
        items: sub.children.map(item => item.name),
      })),
    }));

    return NextResponse.json({ categories: formatted });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminResponse = await requireCategoryAdmin(request);
    if (adminResponse) return adminResponse;

    const body = await request.json();

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const slug = toSlug(body.name);
    const status = body.status === 'active';

    // Create main category
    const category = await prisma.category.create({
      data: {
        name: body.name.trim(),
        slug,
        isActive: status,
        sortOrder: 0,
      },
    });

    // Create subcategories and items
    if (body.subcategories && Array.isArray(body.subcategories)) {
      for (const subcat of body.subcategories) {
        if (!subcat?.name?.trim()) continue;

        const subcategory = await prisma.category.create({
          data: {
            name: subcat.name.trim(),
            slug: toSlug(subcat.name),
            parentId: category.id,
            isActive: status,
          },
        });

        // Create items under subcategory
        if (subcat.items && Array.isArray(subcat.items)) {
          for (const item of subcat.items) {
            if (!String(item).trim()) continue;

            await prisma.category.create({
              data: {
                name: String(item).trim(),
                slug: toSlug(String(item)),
                parentId: subcategory.id,
                isActive: status,
              },
            });
          }
        }
      }
    }

    return NextResponse.json({ message: 'Category created successfully', category }, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
