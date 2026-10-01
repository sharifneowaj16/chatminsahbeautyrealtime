import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';
import {
  adminUnauthorizedResponse,
  getVerifiedAdmin,
} from '@/app/api/admin/_utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getVerifiedAdmin(request);
    if (!admin) {
      return adminUnauthorizedResponse();
    }

    const { id } = await context.params;
    const body = await request.json();

    const name = typeof body.name === 'string' ? body.name.trim() : undefined;
    const contactPerson = typeof body.contactPerson === 'string' ? body.contactPerson.trim() : undefined;
    const email = typeof body.email === 'string' ? body.email.trim() : undefined;
    const phone = typeof body.phone === 'string' ? body.phone.trim() : undefined;
    const address = typeof body.address === 'string' ? body.address.trim() : undefined;
    const notes = typeof body.notes === 'string' ? body.notes.trim() : undefined;
    const paymentTerms = typeof body.paymentTerms === 'string' ? body.paymentTerms.trim() : undefined;
    const isActive = typeof body.isActive === 'boolean' ? body.isActive : undefined;

    const existing = await prisma.supplier.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(contactPerson !== undefined && { contactPerson }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(notes !== undefined && { notes }),
        ...(paymentTerms !== undefined && { paymentTerms }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ success: true, supplier: updated });
  } catch (error) {
    console.error('Admin supplier PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update supplier' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getVerifiedAdmin(request);
    if (!admin) {
      return adminUnauthorizedResponse();
    }

    const { id } = await context.params;

    const existing = await prisma.supplier.findUnique({
      where: { id },
      include: { _count: { select: { purchaseOrders: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    // If purchase orders exist, deactivate supplier to maintain ledger integrity
    if (existing._count.purchaseOrders > 0) {
      await prisma.supplier.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({ success: true, message: 'Supplier has purchase orders and was deactivated' });
    }

    await prisma.supplierProduct.deleteMany({ where: { supplierId: id } });
    await prisma.supplier.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Admin supplier DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete supplier' }, { status: 500 });
  }
}
