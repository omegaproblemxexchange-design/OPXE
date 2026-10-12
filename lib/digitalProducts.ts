import type { AppDigitalProduct } from './appStore';

export const DIGITAL_STORE_WHATSAPP_NUMBER = '919515197745';
export const DIGITAL_STORE_EMAIL = 'omegaproblemxexchange@gmail.com';

export function getDigitalProductWhatsAppUrl(product: AppDigitalProduct, buyerEmail: string) {
  const message = [
    'Hello OPXE, I want to buy this digital product.',
    `Product: ${product.title}`,
    `Product ID: ${product.id}`,
    `Price: INR ${product.priceINR.toLocaleString('en-IN')}`,
    `Email for download delivery: ${buyerEmail.trim()}`,
    'Please share the payment steps. I understand the download will be emailed after payment is manually verified.',
  ].join('\n');
  return `https://wa.me/${DIGITAL_STORE_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
