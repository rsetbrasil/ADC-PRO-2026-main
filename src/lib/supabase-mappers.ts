import type { Order } from '@/lib/types';

export function mapDbOrderToOrder(row: any): Order {
  const firstDueRaw = row.first_due_date ?? row.firstDueDate;
  const firstDueDate = firstDueRaw ? new Date(firstDueRaw) : undefined;
  const itemsRaw = row.items;
  const items = Array.isArray(itemsRaw) ? itemsRaw : [];

  return {
    id: row.id,
    customer: row.customer,
    items,
    total: row.total,
    subtotal: row.subtotal ?? undefined,
    discount: row.discount ?? undefined,
    downPayment: row.down_payment ?? row.downPayment ?? undefined,
    deliveryFee: row.delivery_fee ?? row.deliveryFee ?? undefined,
    installments: row.installments ?? 0,
    installmentValue: row.installment_value ?? row.installmentValue ?? 0,
    date: row.date,
    firstDueDate,
    status: row.status,
    paymentMethod: (row.payment_method ?? row.paymentMethod) as any,
    installmentDetails: (row.installment_details ?? row.installmentDetails ?? []) as any,
    installmentCardDetails: row.installment_card_details ?? row.installmentCardDetails ?? undefined,
    trackingCode: row.tracking_code ?? row.trackingCode ?? undefined,
    attachments: row.attachments ?? undefined,
    sellerId: row.seller_id ?? row.sellerId ?? undefined,
    sellerName: row.seller_name ?? row.sellerName ?? undefined,
    commission: row.commission ?? undefined,
    commissionDate: row.commission_date ?? row.commissionDate ?? undefined,
    commissionPaid: row.commission_paid ?? row.commissionPaid ?? undefined,
    isCommissionManual: row.is_commission_manual ?? row.isCommissionManual ?? undefined,
    observations: row.observations ?? undefined,
    source: row.source ?? undefined,
    createdAt: row.created_at ?? row.createdAt ?? undefined,
    createdById: row.created_by_id ?? row.createdById ?? undefined,
    createdByName: row.created_by_name ?? row.createdByName ?? undefined,
    createdByRole: row.created_by_role ?? row.createdByRole ?? undefined,
    createdIp: row.created_ip ?? row.createdIp ?? undefined,
    asaas: row.asaas ?? undefined,
  };
}

export function mapOrderPatchToDb(
  patch: Partial<Order>,
  style: 'camel' | 'snake' = 'camel'
): Record<string, any> {
  const out: Record<string, any> = {};

  if (patch.status !== undefined) out.status = patch.status;
  if (patch.customer !== undefined) out.customer = patch.customer as any;
  if (patch.items !== undefined) out.items = patch.items as any;
  if (patch.total !== undefined) out.total = patch.total;
  if (patch.subtotal !== undefined) out.subtotal = patch.subtotal;
  if (patch.discount !== undefined) out.discount = patch.discount;
  if (patch.downPayment !== undefined) out[style === 'snake' ? 'down_payment' : 'downPayment'] = patch.downPayment;
  if (patch.deliveryFee !== undefined) out[style === 'snake' ? 'delivery_fee' : 'deliveryFee'] = patch.deliveryFee;
  if (patch.installments !== undefined) out.installments = patch.installments;
  if (patch.installmentValue !== undefined)
    out[style === 'snake' ? 'installment_value' : 'installmentValue'] = patch.installmentValue;
  if (patch.date !== undefined) out.date = patch.date;

  if (patch.firstDueDate !== undefined) {
    const value: any =
      patch.firstDueDate instanceof Date ? patch.firstDueDate.toISOString() : (patch.firstDueDate as any);
    out[style === 'snake' ? 'first_due_date' : 'firstDueDate'] = value;
  }

  if (patch.paymentMethod !== undefined) out[style === 'snake' ? 'payment_method' : 'paymentMethod'] = patch.paymentMethod as any;
  if (patch.installmentDetails !== undefined)
    out[style === 'snake' ? 'installment_details' : 'installmentDetails'] = patch.installmentDetails as any;
  if (patch.installmentCardDetails !== undefined)
    out[style === 'snake' ? 'installment_card_details' : 'installmentCardDetails'] = patch.installmentCardDetails as any;
  if (patch.trackingCode !== undefined) out[style === 'snake' ? 'tracking_code' : 'trackingCode'] = patch.trackingCode;
  if (patch.attachments !== undefined) out.attachments = patch.attachments as any;

  if (patch.sellerId !== undefined) out[style === 'snake' ? 'seller_id' : 'sellerId'] = patch.sellerId;
  if (patch.sellerName !== undefined) out[style === 'snake' ? 'seller_name' : 'sellerName'] = patch.sellerName;

  if (patch.commission !== undefined) out.commission = patch.commission;
  if (patch.commissionDate !== undefined) out[style === 'snake' ? 'commission_date' : 'commissionDate'] = patch.commissionDate;
  if (patch.commissionPaid !== undefined) out[style === 'snake' ? 'commission_paid' : 'commissionPaid'] = patch.commissionPaid;
  if (patch.isCommissionManual !== undefined)
    out[style === 'snake' ? 'is_commission_manual' : 'isCommissionManual'] = patch.isCommissionManual;

  if (patch.observations !== undefined) out.observations = patch.observations;
  if (patch.source !== undefined) out.source = patch.source as any;

  if (patch.createdById !== undefined) out[style === 'snake' ? 'created_by_id' : 'createdById'] = patch.createdById;
  if (patch.createdByName !== undefined) out[style === 'snake' ? 'created_by_name' : 'createdByName'] = patch.createdByName;
  if (patch.createdByRole !== undefined) out[style === 'snake' ? 'created_by_role' : 'createdByRole'] = patch.createdByRole as any;
  if (patch.createdIp !== undefined) out[style === 'snake' ? 'created_ip' : 'createdIp'] = patch.createdIp;

  if (patch.asaas !== undefined) out.asaas = patch.asaas as any;

  return out;
}
