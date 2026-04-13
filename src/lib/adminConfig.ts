export interface AdminConfig {
  promptInstructions: string;
  stakeholderNotes: string;
}

const STORAGE_KEY = 'carmatch-admin-config';

export const defaultAdminConfig: AdminConfig = {
  promptInstructions:
    'Keep recommendations practical, honest, and budget-aware. Prioritize one clear next action customers can take now.',
  stakeholderNotes:
    'Sales team: follow up quote/booking leads within 30 minutes. Finance team: confirm APR ranges and campaign windows daily.',
};

export function loadAdminConfig(): AdminConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultAdminConfig;
    const parsed = JSON.parse(raw) as Partial<AdminConfig>;
    return {
      promptInstructions: parsed.promptInstructions?.trim() || defaultAdminConfig.promptInstructions,
      stakeholderNotes: parsed.stakeholderNotes?.trim() || defaultAdminConfig.stakeholderNotes,
    };
  } catch {
    return defaultAdminConfig;
  }
}

export function saveAdminConfig(config: AdminConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

