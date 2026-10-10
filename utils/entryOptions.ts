// Dropdown options shared by the entry forms, dashboard and the AI agent
export const EXPENSE_REASONS = ['Labour Cost', 'Raw Material', 'Logistics', 'Oil', 'Hardware', 'Electricity', 'Maintenance', 'Misc']
export const INCOME_REASONS = ['Fan Payment', 'Submersible Payment', 'Scrap Payment', 'Misc']
export const PERSONAL_CATEGORIES = ['Groceries', 'Medical', 'School / Education', 'Rent', 'Utilities', 'Travel', 'Clothing', 'Entertainment', 'Misc']

export const SUBMERSIBLE_SIZES: (string | number)[] = [3, 4, 4.5, 5, '5v4', 5.5, '5.5v4', 6, '6v4', '7v3', '7v4', 8, 9, 10, 11, 12, 13, 15, 'Repair']
// Map loose input ("8 v4", "10V4", '4"', "4 inch") to a size from SUBMERSIBLE_SIZES.
// From 8 upwards there are no v-variants, so "8v4"/"9v3" just mean 8/9.
export function normalizeSubmersibleSize(raw?: string | number): string | undefined {
  if (raw === undefined || raw === null) return undefined
  const valid = SUBMERSIBLE_SIZES.map(String)
  const s = String(raw).trim().toLowerCase().replace(/inches|inch|in\b|["'”″]/g, '').replace(/\s+/g, '')
  const exact = valid.find(v => v.toLowerCase() === s)
  if (exact) return exact
  const m = /^(\d+(?:\.\d+)?)v(\d)$/.exec(s)
  if (m) {
    const base = Number(m[1])
    if (base >= 8 && valid.includes(String(base))) return String(base)
    const variant = `${base}v${m[2]}`
    if (valid.includes(variant)) return variant
  }
  return String(raw).trim()
}

export const FAN_ROTOR_SIZES =["6'", "7'", '1"', '1.25"', "6' kit", '1" kit', '1.25 kit']

// Window events used to keep pages in sync with the AI quick-log panel
export const DATA_CHANGED_EVENT = 'mh:data-changed'
export const OPEN_AGENT_EVENT = 'mh:open-agent'
