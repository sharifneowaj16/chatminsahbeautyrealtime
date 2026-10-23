import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminAccessToken } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('admin_access_token')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = await verifyAdminAccessToken(accessToken);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const [suppliersDb, purchaseOrdersDb] = await Promise.all([
      prisma.supplier.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              products: true,
              purchaseOrders: true,
            },
          },
          purchaseOrders: {
            select: {
              totalAmount: true,
              status: true,
            },
          },
        },
      }),
      prisma.purchaseOrder.findMany({
        orderBy: { orderedAt: 'desc' },
        take: 50,
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
            },
          },
          items: {
            select: {
              quantity: true,
            },
          },
        },
      }),
    ]);

    const suppliers = suppliersDb.map((s) => {
      const totalProcurement = s.purchaseOrders.reduce(
        (sum, po) => sum + Number(po.totalAmount || 0),
        0
      );

      return {
        id: s.code || `SUP-${s.id.slice(-4).toUpperCase()}`,
        dbId: s.id,
        name: s.name,
        contactPerson: s.contactPerson || 'Not Specified',
        phone: s.phone || 'N/A',
        email: s.email || 'N/A',
        origin: s.address || 'Dhaka, Bangladesh',
        skuCount: s._count.products || 0,
        totalProcurement,
        leadTime: '7-14 Days',
        paymentTerms: s.paymentTerms || 'Net-30',
        status: s.isActive ? ('Active' as const) : ('Inactive' as const),
      };
    });

    const purchaseOrders = purchaseOrdersDb.map((po) => {
      const itemCount = po.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      const rawStatus = (po.status || 'DRAFT').toUpperCase();
      let fulfillmentStatus: 'Delivered' | 'In Transit' | 'Draft' = 'Draft';
      if (rawStatus === 'RECEIVED' || rawStatus === 'DELIVERED') {
        fulfillmentStatus = 'Delivered';
      } else if (rawStatus === 'ORDERED' || rawStatus === 'IN_TRANSIT') {
        fulfillmentStatus = 'In Transit';
      }

      return {
        id: po.orderNumber,
        dbId: po.id,
        supplierName: po.supplier?.name || 'Unknown Supplier',
        createdAt: po.orderedAt.toISOString().split('T')[0],
        expectedDate: po.receivedAt
          ? po.receivedAt.toISOString().split('T')[0]
          : new Date(po.orderedAt.getTime() + 14 * 86400000).toISOString().split('T')[0],
        itemCount: itemCount || 1,
        totalAmount: Number(po.totalAmount),
        paymentStatus: 'Paid' as const,
        fulfillmentStatus,
      };
    });

    return NextResponse.json({
      success: true,
      suppliers,
      purchaseOrders,
      stats: {
        activeSuppliersCount: suppliersDb.filter((s) => s.isActive).length,
        totalPosCount: purchaseOrdersDb.length,
        totalProcurementVolume: suppliers.reduce((sum, s) => sum + s.totalProcurement, 0),
      },
    });
  } catch (error) {
    console.error('GET /api/admin/suppliers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('admin_access_token')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = await verifyAdminAccessToken(accessToken);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'CREATE_SUPPLIER') {
      const { name, contactPerson, email, phone, address, paymentTerms, notes } = body;
      const code = `SUP-${Date.now().toString().slice(-4)}`;

      const newSupplier = await prisma.supplier.create({
        data: {
          code,
          name,
          contactPerson,
          email,
          phone,
          address,
          paymentTerms: paymentTerms || 'Net-30',
          notes,
          isActive: true,
        },
      });

      return NextResponse.json({ success: true, supplier: newSupplier });
    }

    if (action === 'CREATE_PO') {
      const { supplierId, totalAmount, notes } = body;
      const orderNumber = `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

      const po = await prisma.purchaseOrder.create({
        data: {
          orderNumber,
          supplierId,
          totalAmount: Number(totalAmount || 0),
          subtotal: Number(totalAmount || 0),
          status: 'ORDERED',
          notes,
        },
      });

      return NextResponse.json({ success: true, purchaseOrder: po });
    }

    if (action === 'UPDATE_PO_STATUS') {
      const { id, status } = body;
      const updated = await prisma.purchaseOrder.update({
        where: { id },
        data: {
          status,
          receivedAt: status === 'RECEIVED' ? new Date() : undefined,
        },
      });

      return NextResponse.json({ success: true, purchaseOrder: updated });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('POST /api/admin/suppliers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
