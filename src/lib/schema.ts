// The phone screens are generated from the Suite API itself (src/lib/suite-schema.json, written by
// mac-skreenit/scripts/gen_suite_mobile_schema.py). This file turns that flat list of operations into
// modules -> lists (GET collections) -> items (rows) -> actions, and holds the few hand-written overrides.
import raw from './suite-schema.json';

import type { Rights } from '@/lib/api';

export type FieldType = 'text' | 'number' | 'boolean' | 'select' | 'date' | 'datetime' | 'rows' | 'list' | 'json' | 'file';
export interface Field {
  name: string;
  label: string;
  required: boolean;
  type: FieldType;
  options?: (string | number)[];
  fields?: Field[];
  default?: unknown;
  /** where the choices come from, when the field name alone does not say (or the usual list needs rights an employee lacks) */
  lookup?: { path: string; key?: string };
}
export interface Param {
  name: string;
  required: boolean;
  type: string;
  default: unknown;
  enum: string[] | null;
}
export interface Op {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  summary: string;
  rights: string[][];
  path_params: Param[];
  query: Param[];
  body: Field[] | null;
  multipart: boolean;
}

const data = raw as unknown as { operations: Op[]; modules: Record<string, { label: string; area: string }> };
export const OPS = data.operations;
export const MODULE_INFO = data.modules;

export const AREA_LABEL: Record<string, string> = {
  people: 'People', sales: 'Sales', buying: 'Buying and stock', money: 'Money', work: 'Clients and work', industry: 'Production and industry', platform: 'Company',
};
export const AREA_ORDER = ['people', 'sales', 'buying', 'money', 'work', 'industry', 'platform'];

// ---------------------------------------------------------------- rights
export const moduleOf = (op: Op): string => {
  if (op.path.startsWith('/ess/') || op.path.startsWith('/timesheets/me')) return 'ess';
  if (op.path.startsWith('/notifications')) return 'notifications';
  return op.rights[0]?.[0] ?? 'self';
};
/** Any one of the operation's (module, action) pairs is enough, like the server's own check. Self-service has no pairs. */
export const allowed = (op: Op, rights: Rights): boolean => !op.rights.length || op.rights.some(([m, a]) => !!rights?.[m]?.[a as 'view']);

// ---------------------------------------------------------------- operation kinds
const last = (p: string) => p.split('/').filter(Boolean).pop() ?? '';
export const isFileOp = (op: Op): boolean =>
  op.method === 'GET' && (op.path.startsWith('/export/') || (last(op.path) === 'template' && op.path !== '/org/template') || /\/pdf(\/|$)/.test(op.path));
export const isCollection = (op: Op) => op.method === 'GET' && !op.path_params.length && !isFileOp(op);
const HIDDEN = new Set(['/modules', '/files', '/notifications/read-all']);

export const humanize = (s: string) => s.replace(/[{}]/g, '').replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase());

export interface Resource {
  path: string;
  label: string;
  list: Op;
}
export interface ModuleModel {
  key: string;
  label: string;
  resources: Resource[];
  files: Op[];
  /** every other operation of the module; assigned to a resource through ownerOf() */
  ops: Op[];
}

const ALL_COLLECTIONS = OPS.filter(isCollection).filter((o) => !HIDDEN.has(o.path));
/** The list an operation belongs to: the longest GET collection path that is a prefix of it. */
export function ownerOf(op: Op): Resource | null {
  let best: Op | null = null;
  for (const c of ALL_COLLECTIONS) {
    if (moduleOf(c) !== moduleOf(op) && moduleOf(op) !== 'self') continue;
    if ((op.path === c.path || op.path.startsWith(c.path + '/')) && (!best || c.path.length > best.path.length)) best = c;
  }
  return best ? { path: best.path, label: labelFor(best.path), list: best } : null;
}
function labelFor(path: string): string {
  const segs = path.split('/').filter(Boolean);
  if (segs[0] === 'ess' && segs.length > 1) return ({ home: 'My details', payslips: 'Payslips', attendance: 'Attendance', leave: 'Leave', expenses: 'Expense claims', loans: 'Loans', performance: 'Performance', training: 'Training' } as Record<string, string>)[segs[1]] ?? humanize(segs[1]);
  if (segs.length === 1) return humanize(segs[0]);
  return humanize(segs[segs.length - 1]) === 'Summary' ? `${humanize(segs[0])} summary` : humanize(segs[segs.length - 1]);
}

// The list a module opens on, where it is not simply the shortest path.
const MAIN: Record<string, string> = {
  employees: '/employees', leave: '/leave/requests', payroll: '/payroll/runs', expense_claims: '/expenses/claims', performance: '/performance/reviews', training: '/training/trainings',
  organisation: '/org/structure', credit_notes: '/credit-notes', recurring_billing: '/recurring', purchase_orders: '/purchase-orders', goods_received: '/grns', stock: '/stock/items',
  vendor_bills: '/vendor-bills', production: '/work-orders', activity_log: '/activity', attendance: '/attendance/month', approvals: '/approvals', ess: '/ess/home',
};
const MODEL_CACHE = new Map<string, ModuleModel>();
export function buildModule(key: string): ModuleModel {
  const hit = MODEL_CACHE.get(key);
  if (hit) return hit;
  const mine = OPS.filter((o) => moduleOf(o) === key && !HIDDEN.has(o.path));
  const main = MAIN[key];
  const resources = mine.filter(isCollection).map((c) => ({ path: c.path, label: labelFor(c.path), list: c }))
    .sort((a, b) => Number(b.path === main) - Number(a.path === main) || a.path.split('/').length - b.path.split('/').length || a.path.localeCompare(b.path));
  const model: ModuleModel = { key, label: key === 'ess' ? 'My space' : key === 'notifications' ? 'Notifications' : MODULE_INFO[key]?.label ?? humanize(key), resources, files: mine.filter(isFileOp), ops: mine.filter((o) => !isCollection(o) && !isFileOp(o)) };
  MODEL_CACHE.set(key, model);
  return model;
}

const opsOwnedBy = (model: ModuleModel, base: string) =>
  [...model.ops, ...model.resources.filter((r) => r.path !== base).map((r) => r.list)].filter((o) => (o.path === base || o.path.startsWith(base + '/')) && ownerOf(o)?.path === base);

/** Buttons for a whole list: add, save settings, run and so on (changing operations without a row). */
export const headerOps = (model: ModuleModel, resource: Resource): Op[] => opsOwnedBy(model, resource.path).filter((o) => o.method !== 'GET' && !o.path_params.length);

/** What can be done with one row of a list: found under array `section` of the payload, or '' for a plain list. */
export function opsForRows(model: ModuleModel, resource: Resource, section: string) {
  const owned = opsOwnedBy(model, resource.path).filter((o) => o.path_params.length === 1);
  const under = (sect: string) => {
    const re = new RegExp(`^${sect}/\\{[^}]+\\}(/.*)?$`);
    return owned.filter((o) => re.test(o.path.slice(resource.path.length)));
  };
  // A payload key like "requests" or "claims" is part of the address; a wrapper like "items" is not.
  const named = section ? under(`/${section}`) : [];
  const items = named.length ? named : under('');
  const prefix = named.length ? `/${section}` : '';
  return { items, detail: items.find((o) => o.method === 'GET' && o.path.slice(resource.path.length) === `${prefix}/{${o.path_params[0].name}}`) };
}

/** Changing operations of a module that belong to no list: shown in the module's "More" menu. */
export const looseOps = (model: ModuleModel): Op[] => model.ops.filter((o) => o.method !== 'GET' && !o.path_params.length && !ownerOf(o));

// ---------------------------------------------------------------- hand-written forms for operations the API leaves free-form
export const OVERRIDES: Record<string, Field[]> = {
  'POST /ess/leave/requests': [
    { name: 'leave_type_id', label: 'Leave type', required: true, type: 'text', lookup: { path: '/ess/leave', key: 'types' } },
    { name: 'from_date', label: 'From', required: true, type: 'date' },
    { name: 'to_date', label: 'To', required: true, type: 'date' },
    { name: 'half_day', label: 'Half day', required: false, type: 'boolean' },
    { name: 'reason', label: 'Reason', required: false, type: 'text' },
  ],
  'POST /ess/expenses/claims': [
    { name: 'title', label: 'Title', required: true, type: 'text' },
    {
      name: 'items', label: 'Expenses', required: true, type: 'rows',
      fields: [
        { name: 'category_id', label: 'Category', required: true, type: 'text', lookup: { path: '/ess/expenses', key: 'categories' } },
        { name: 'expense_date', label: 'Date', required: true, type: 'date' },
        { name: 'description', label: 'What for', required: false, type: 'text' },
        { name: 'amount', label: 'Amount (₹)', required: true, type: 'number' },
        { name: 'receipt_no', label: 'Receipt number', required: false, type: 'text' },
      ],
    },
  ],
  'PUT /ess/performance/goals/{goal_id}': [{ name: 'progress', label: 'Progress (0 to 100)', required: true, type: 'number' }],
  'POST /approvals/{aid}/decide': [
    { name: 'decision', label: 'Decision', required: true, type: 'select', options: ['approve', 'reject'] },
    { name: 'note', label: 'Note (needed when rejecting)', required: false, type: 'text' },
  ],
  'POST /quotations/{doc_id}/respond': [
    { name: 'accepted', label: 'Accepted by the customer', required: false, type: 'boolean' },
    { name: 'note', label: 'Note', required: false, type: 'text' },
  ],
};
/** Where a field's choices come from: field name -> list to pick from (label comes from the row's name/title). */
export const LOOKUPS: Record<string, { path: string; key?: string }> = {
  employee_id: { path: '/employees' }, reports_to: { path: '/employees' }, manager_employee_id: { path: '/employees' }, assignee_employee_id: { path: '/employees' },
  head_employee_id: { path: '/employees' }, customer_id: { path: '/customers' }, vendor_id: { path: '/vendors' }, item_id: { path: '/items' }, branch_id: { path: '/branches' },
  location_id: { path: '/stock/locations' }, default_location_id: { path: '/stock/locations' }, from_location_id: { path: '/stock/locations' }, to_location_id: { path: '/stock/locations' },
  invoice_id: { path: '/invoices' }, po_id: { path: '/purchase-orders' }, leave_type_id: { path: '/leave/types' }, project_id: { path: '/projects' }, bom_id: { path: '/boms' }, wo_id: { path: '/work-orders' },
  category_id: { path: '/expenses/categories' }, requisition_id: { path: '/requisitions' }, cycle_id: { path: '/performance/cycles' }, approver_user_id: { path: '/users' }, owner_user_id: { path: '/users' },
  user_id: { path: '/users' }, department_id: { path: '/departments' }, function_id: { path: '/org/functions' }, designation_id: { path: '/org/designations' }, grade_id: { path: '/org/grades' },
  role_id: { path: '/org/roles' }, position_id: { path: '/org/structure', key: 'positions' }, reports_to_position_id: { path: '/org/structure', key: 'positions' },
};
export const DATE_NAME = /(date|dob|doj|_on$|^from$|^to$|^start$|^end$|valid_until|expires|due)/i;
