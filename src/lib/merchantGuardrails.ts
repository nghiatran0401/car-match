import type { MerchantDealGuardrails } from '../types';

const STORAGE_KEY = 'carmatch-merchant-guardrails';

export const defaultMerchantGuardrails: MerchantDealGuardrails = {
  discountMinPct: 3,
  discountMaxPct: 8,
  aprMinPct: 5.9,
  aprMaxPct: 9.9,
  minDepositPct: 10,
  maxDepositPct: 30,
  allowedPerks: ['Accessories package', 'Service package', 'Extended warranty'],
};

export function loadMerchantGuardrails(): MerchantDealGuardrails {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultMerchantGuardrails;
    const parsed = JSON.parse(raw) as Partial<MerchantDealGuardrails>;
    return {
      ...defaultMerchantGuardrails,
      ...parsed,
      allowedPerks: Array.isArray(parsed.allowedPerks)
        ? parsed.allowedPerks.filter(Boolean)
        : defaultMerchantGuardrails.allowedPerks,
    };
  } catch {
    return defaultMerchantGuardrails;
  }
}

export function saveMerchantGuardrails(guardrails: MerchantDealGuardrails): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(guardrails));
}

