// Turns whatever a Suite list returns into readable cards, without a screen written per list.
export type Row = Record<string, unknown>;
export const isObj = (v: unknown): v is Row => !!v && typeof v === 'object' && !Array.isArray(v);
export const isRows = (v: unknown): v is Row[] => Array.isArray(v) && v.length > 0 && v.every(isObj);

/** Split a payload into plain facts and named lists of rows. A bare array is one list with an empty name. */
export function sectionsOf(payload: unknown): { facts: Row; lists: { name: string; rows: Row[] }[]; empty: boolean } {
  if (Array.isArray(payload)) return { facts: {}, lists: [{ name: '', rows: payload.filter(isObj) }], empty: payload.length === 0 };
  if (!isObj(payload)) return { facts: { value: payload }, lists: [], empty: payload === null || payload === undefined };
  const facts: Row = {};
  const lists: { name: string; rows: Row[] }[] = [];
  for (const [k, v] of Object.entries(payload)) {
    if (isRows(v)) lists.push({ name: k, rows: v });
    else if (Array.isArray(v) && v.length === 0) lists.push({ name: k, rows: [] });
    else facts[k] = v;
  }
  return { facts, lists, empty: false };
}

const TITLE = ['name', 'title', 'label', 'candidate_name', 'employee_name', 'full_name', 'party_name', 'customer_name', 'vendor_name', 'number', 'doc_number', 'invoice_number', 'code', 'description', 'training', 'cycle', 'module_key', 'action'];
const SUB = ['emp_code', 'code', 'number', 'email', 'phone', 'designation', 'department', 'branch', 'employee', 'customer', 'vendor', 'type', 'kind', 'date', 'from_date', 'start_date', 'due_date', 'created_at'];
const MONEY = /(total|amount|net|gross|balance|price|rate|ctc|principal|emi|outstanding|paid|due|value|cost|salary)/i;

export const money = (n: unknown) => '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
export const humanKey = (k: string) => k.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
const ISO = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?Z?)?$/;

export function show(key: string, v: unknown, plain = false): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'number') return !plain && MONEY.test(key) && !/(count|days|months|year|qty|quantity|level|weight|progress|rating)/i.test(key) ? money(v) : String(v);
  if (typeof v === 'string') {
    if (ISO.test(v)) {
      const d = new Date(v.length === 10 ? `${v}T00:00:00` : v.endsWith('Z') || /[+-]\d\d:?\d\d$/.test(v) ? v : `${v}Z`);
      if (!isNaN(d.getTime())) return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return v;
  }
  if (Array.isArray(v)) return v.length ? (v.every((x) => typeof x !== 'object') ? v.join(', ') : `${v.length} entries`) : '—';
  return JSON.stringify(v);
}

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' ? String(v) : '');
export const titleOf = (r: Row): string => {
  for (const k of TITLE) if (str(r[k])) return str(r[k]);
  const first = Object.entries(r).find(([k, v]) => typeof v === 'string' && v && !k.endsWith('id') && !ISO.test(v as string));
  return first ? String(first[1]) : 'Item';
};
export const subtitleOf = (r: Row, title: string): string =>
  SUB.map((k) => (str(r[k]) && str(r[k]) !== title ? show(k, r[k]) : '')).filter(Boolean).slice(0, 3).join(' · ');
export const statusOf = (r: Row): string | null => (typeof r.status === 'string' && r.status ? r.status : typeof r.state === 'string' ? r.state : null);
export function amountOf(r: Row): string | null {
  for (const k of ['total', 'grand_total', 'amount', 'net', 'net_pay', 'balance', 'principal', 'ctc_annual', 'outstanding']) if (typeof r[k] === 'number') return money(r[k]);
  return null;
}
export const idOf = (r: Row, param: string): string => String(r.id ?? r[param] ?? r.code ?? '');
