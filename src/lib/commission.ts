import type { Order, Product } from '@/lib/types';

export function calculateOrderCommission(order: Order, allProducts: Product[], fallbackPercentage = 5): number {
  if (order.isCommissionManual && typeof order.commission === 'number' && order.commission > 0) {
    return order.commission;
  }

  if (!order.sellerId) {
    return 0;
  }

  const toNumber = (value: unknown) => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
      const normalized = value
        .replace(/\s/g, '')
        .replace(/^R\$/i, '')
        .replace(/\./g, '')
        .replace(',', '.');
      const parsed = Number.parseFloat(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  return order.items.reduce((totalCommission, item) => {
    const product = allProducts.find((p) => p.id === item.id);
    const hasExplicitCommissionValue =
      product &&
      typeof product.commissionValue === 'number' &&
      Number.isFinite(product.commissionValue) &&
      product.commissionValue > 0;

    const commissionType = hasExplicitCommissionValue ? product!.commissionType || 'percentage' : 'percentage';
    const commissionValue = hasExplicitCommissionValue ? product!.commissionValue! : fallbackPercentage;

    if (commissionType === 'fixed') {
      return totalCommission + commissionValue * item.quantity;
    }

    if (commissionType === 'percentage') {
      const price = toNumber((item as any).price);
      const quantity = toNumber((item as any).quantity);
      const itemTotal = price * quantity;
      return totalCommission + itemTotal * (commissionValue / 100);
    }

    return totalCommission;
  }, 0);
}
