import type { MerchantDealGuardrails } from '../types';

export interface NegotiationStrategy {
  requestedDiscountPct?: number;
  approvedDiscountPct: number;
  message: string;
}

function parseRequestedDiscount(input: string): number | undefined {
  const match = input.match(/(\d{1,2})(?:\s*%|\s*percent)/i);
  if (!match?.[1]) return undefined;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return undefined;
  return value;
}

export function buildNegotiationStrategy(
  userText: string,
  guardrails: MerchantDealGuardrails,
  language: 'vi' | 'en',
): NegotiationStrategy | null {
  const normalized = userText.toLowerCase();
  const asksDiscount =
    normalized.includes('discount') ||
    normalized.includes('giam') ||
    normalized.includes('giảm') ||
    normalized.includes('best price') ||
    normalized.includes('final price');
  if (!asksDiscount) return null;

  const requestedDiscountPct = parseRequestedDiscount(userText);
  const approvedDiscountPct = Math.min(
    requestedDiscountPct ?? guardrails.discountMaxPct,
    guardrails.discountMaxPct,
  );
  const safeFloor = guardrails.discountMinPct;
  const negotiationRange = `${safeFloor}% - ${guardrails.discountMaxPct}%`;

  const message =
    language === 'vi'
      ? `Khung thuong luong duoc phe duyet la ${negotiationRange}. De xuat hien tai: xin muc ${approvedDiscountPct}% va neu can co the doi sang uu dai ${guardrails.allowedPerks.slice(0, 2).join(', ')}.`
      : `Approved negotiation range is ${negotiationRange}. Recommended ask: ${approvedDiscountPct}% discount, and if capped, trade for ${guardrails.allowedPerks.slice(0, 2).join(', ')}.`;

  return {
    requestedDiscountPct,
    approvedDiscountPct,
    message,
  };
}

