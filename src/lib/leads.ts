import type { LeadRecord } from '../types';

const STORAGE_KEY = 'carmatch-leads';

export function saveLead(record: Omit<LeadRecord, 'id' | 'createdAt'> & { id?: string }): LeadRecord {
  const full: LeadRecord = {
    id: record.id ?? `lead_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    type: record.type,
    vehicleModelSlug: record.vehicleModelSlug,
    showroomId: record.showroomId,
    contact: record.contact,
    notes: record.notes,
    finance: record.finance,
    profileSnapshot: record.profileSnapshot,
    commercialContext: record.commercialContext,
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: LeadRecord[] = raw ? JSON.parse(raw) : [];
    list.push(full);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
  return full;
}

export function listLeads(): LeadRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
