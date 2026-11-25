import type { Order } from '../types/order';

/**
 * WhatsApp click-to-chat (Phase 1A, REQUIREMENTS.md): opens WhatsApp with
 * the customer's number and a pre-filled message that staff can edit and
 * send themselves. No WhatsApp Business API, nothing sent automatically.
 */

/** Rwandan local numbers (07…) to the international form wa.me needs (2507…). */
export function toWhatsAppNumber(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 9) return null;
  if (digits.startsWith('250')) return digits;
  if (digits.startsWith('0')) return `250${digits.slice(1)}`;
  if (digits.length === 9) return `250${digits}`;
  return digits;
}

const rwf = (n: number) => `${n.toLocaleString()} RWF`;

/** A short message suited to where the order is. Staff can change it before sending. */
export function orderMessage(order: Order, businessName: string): string {
  const name = order.customerName.split(' ')[0];
  const balance = order.balanceDue > 0 ? ` Balance to pay: ${rwf(order.balanceDue)}.` : '';
  if (order.currentStage === 'READY') {
    return `Hello ${name}, your order ${order.orderNumber} is ready for collection at ${businessName}.${balance} Please bring your order slip. Thank you!`;
  }
  if (order.currentStage === 'DELIVERED') {
    return `Hello ${name}, thank you for choosing ${businessName}. Your order ${order.orderNumber} has been completed.`;
  }
  const ready = order.expectedCompletion
    ? ` It should be ready ${new Date(order.expectedCompletion).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}.`
    : '';
  return `Hello ${name}, we have received your order ${order.orderNumber} at ${businessName} (total ${rwf(order.totalAmount)}).${ready}${balance} Thank you!`;
}

export function whatsAppLink(phone: string, message: string): string | null {
  const number = toWhatsAppNumber(phone);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;
}
