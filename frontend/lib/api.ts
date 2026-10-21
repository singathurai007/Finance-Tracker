/**
 * Typed fetch helpers for the PaisaTrack REST API.
 *
 * Requests use relative `/api/...` URLs which Next.js rewrites to
 * `http://localhost:3001/api/...` (see `next.config.ts`).
 */

import { clearSession, getToken, type AuthUser, type Session } from "./auth";

export const API_BASE = "/api";
export const API_ORIGIN = "http://localhost:3001/api";

/* ------------------------------------------------------------------ enums */

export type TransactionType = "INCOME" | "EXPENSE";
export type AccountType = "CASH" | "BANK" | "SAVINGS" | "CREDIT_CARD" | "WALLET";
export type PaymentMethod =
  | "CASH"
  | "UPI"
  | "DEBIT_CARD"
  | "CREDIT_CARD"
  | "NET_BANKING"
  | "OTHER";
export type BudgetStatus = "ok" | "warning" | "exceeded";
export type AuditLevel = "INFO" | "WARN" | "ERROR";

export const TRANSACTION_TYPES: readonly TransactionType[] = ["INCOME", "EXPENSE"];
export const ACCOUNT_TYPES: readonly AccountType[] = [
  "CASH",
  "BANK",
  "SAVINGS",
  "CREDIT_CARD",
  "WALLET",
];
export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  "CASH",
  "UPI",
  "DEBIT_CARD",
  "CREDIT_CARD",
  "NET_BANKING",
  "OTHER",
];
export const AUDIT_LEVELS: readonly AuditLevel[] = ["INFO", "WARN", "ERROR"];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CASH: "Cash",
  BANK: "Bank account",
  SAVINGS: "Savings account",
  CREDIT_CARD: "Credit card",
  WALLET: "Wallet",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  UPI: "UPI",
  DEBIT_CARD: "Debit card",
  CREDIT_CARD: "Credit card",
  NET_BANKING: "Net banking",
  OTHER: "Other",
};

/* ----------------------------------------------------------------- models */

export interface Health {
  status: string;
  service: string;
  timestamp: string;
}

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  openingBalance: number;
  currency: string;
  archived: boolean;
  balance: number;
  income: number;
  expenses: number;
  transactionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: number;
  name: string;
  type: TransactionType;
  color: string;
}

export interface AccountRef {
  id: number;
  name: string;
  type: string;
}

export interface CategoryRef {
  id: number;
  name: string;
  color: string;
  type: string;
}

export interface Transaction {
  id: number;
  type: TransactionType;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
  accountId: number;
  account: AccountRef | null;
  categoryId: number | null;
  category: CategoryRef | null;
}

export interface TransactionsResult {
  data: Transaction[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  totals: { income: number; expenses: number; net: number };
}

export interface Budget {
  id: number;
  amount: number;
  month: number;
  year: number;
  categoryId: number;
  category: Category;
  spent: number;
  remaining: number;
  percentage: number;
  status: BudgetStatus;
}

export interface ReportSummary {
  month: number;
  year: number;
  income: number;
  expenses: number;
  balance: number;
  savingsRate: number;
  transactionCount: number;
  averageDailySpend: number;
  topCategory: { name: string; total: number; color: string } | null;
}

export interface CategoryBreakdownItem {
  categoryId: number | null;
  name: string;
  color: string;
  total: number;
  percentage: number;
  count: number;
}

export interface CategoryBreakdown {
  type: string;
  total: number;
  items: CategoryBreakdownItem[];
}

export interface MonthlyTrendPoint {
  key: string;
  label: string;
  income: number;
  expenses: number;
  net: number;
}

export interface AuditLog {
  id: number;
  level: AuditLevel;
  action: string;
  entity: string;
  entityId: string | null;
  message: string | null;
  metadata: unknown;
  createdAt: string;
}

export interface AuditLogsResult {
  data: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/* ----------------------------------------------------------------- errors */

export interface ApiErrorBody {
  statusCode?: number;
  error?: string;
  message?: string | string[];
  path?: string;
  timestamp?: string;
}

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody | null;

  constructor(message: string, status: number, body: ApiErrorBody | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

function messageFromBody(body: ApiErrorBody | null, status: number): string {
  if (body?.message) {
    return Array.isArray(body.message) ? body.message.join(", ") : body.message;
  }
  if (status === 0) return "Could not reach the API server.";
  return `Request failed (status ${status}).`;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...authHeaders(),
      },
    });
  } catch {
    throw new ApiError(
      `Could not reach the API at ${API_ORIGIN}. Make sure the backend is running.`,
      0,
    );
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (!res.ok) {
    // An expired or revoked token should drop the session so the shell
    // sends the user back to the login page.
    if (res.status === 401) clearSession();
    const body = (parsed as ApiErrorBody | null) ?? null;
    throw new ApiError(messageFromBody(body, res.status), res.status, body);
  }

  return parsed as T;
}

function buildQuery(
  params: Record<string, string | number | undefined | null>,
): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    sp.set(key, String(value));
  }
  return sp.toString();
}

/* ----------------------------------------------------------------- health */

export function getHealth(): Promise<Health> {
  return request<Health>("/health");
}

/* --------------------------------------------------------------- accounts */

export interface AccountInput {
  name: string;
  type?: AccountType;
  openingBalance?: number;
  currency?: string;
}

export function listAccounts(): Promise<Account[]> {
  return request<Account[]>("/accounts");
}

export function createAccount(input: AccountInput): Promise<Account> {
  return request<Account>("/accounts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAccount(
  id: number,
  input: Partial<AccountInput> & { archived?: boolean },
): Promise<Account> {
  return request<Account>(`/accounts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteAccount(id: number): Promise<void> {
  return request<void>(`/accounts/${id}`, { method: "DELETE" });
}

/* ------------------------------------------------------------- categories */

export interface CategoryInput {
  name: string;
  type: TransactionType;
  color?: string;
}

export function listCategories(): Promise<Category[]> {
  return request<Category[]>("/categories");
}

export function createCategory(input: CategoryInput): Promise<Category> {
  return request<Category>("/categories", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateCategory(
  id: number,
  input: Partial<CategoryInput>,
): Promise<Category> {
  return request<Category>(`/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteCategory(id: number): Promise<void> {
  return request<void>(`/categories/${id}`, { method: "DELETE" });
}

/* ----------------------------------------------------------- transactions */

export interface TransactionFilters {
  type?: TransactionType | "";
  categoryId?: number | "";
  accountId?: number | "";
  search?: string;
  /** "YYYY-MM"; expanded to the inclusive from/to range the API expects. */
  month?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "date" | "amount";
  sortOrder?: "asc" | "desc";
}

export function transactionQuery(filters: TransactionFilters): string {
  const range = monthRange(filters.month);
  return buildQuery({
    type: filters.type,
    categoryId: filters.categoryId,
    accountId: filters.accountId,
    search: filters.search,
    from: range.from,
    to: range.to,
    page: filters.page,
    pageSize: filters.pageSize,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  });
}

/** "YYYY-MM" -> date-only range from the 1st to the last day of that month. */
function monthRange(month?: string): { from?: string; to?: string } {
  const match = /^(\d{4})-(\d{2})$/.exec(month ?? "");
  if (!match) return {};
  const [, year, monthNumber] = match;
  const lastDay = new Date(Date.UTC(Number(year), Number(monthNumber), 0)).getUTCDate();
  return {
    from: `${year}-${monthNumber}-01`,
    to: `${year}-${monthNumber}-${String(lastDay).padStart(2, "0")}`,
  };
}

export interface TransactionInput {
  type: TransactionType;
  description: string;
  amount: number;
  date?: string;
  accountId: number;
  categoryId?: number | null;
  paymentMethod?: PaymentMethod;
  notes?: string | null;
}

export function listTransactions(
  filters: TransactionFilters,
): Promise<TransactionsResult> {
  return request<TransactionsResult>(`/transactions?${transactionQuery(filters)}`);
}

export function createTransaction(
  input: TransactionInput,
): Promise<Transaction> {
  return request<Transaction>("/transactions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateTransaction(
  id: number,
  input: Partial<TransactionInput>,
): Promise<Transaction> {
  return request<Transaction>(`/transactions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteTransaction(id: number): Promise<void> {
  return request<void>(`/transactions/${id}`, { method: "DELETE" });
}

/** Relative URL for the CSV export (used as a plain <a href>). */
export function transactionsExportHref(filters: TransactionFilters): string {
  // Pagination is intentionally omitted so the whole filtered set is exported.
  const rest: TransactionFilters = { ...filters };
  delete rest.page;
  delete rest.pageSize;
  const qs = transactionQuery(rest);
  return `${API_BASE}/transactions/export${qs ? `?${qs}` : ""}`;
}

/**
 * Downloads the filtered CSV with the bearer token attached.
 *
 * A plain `<a download>` cannot send the Authorization header, so the file is
 * fetched as a Blob and handed to the browser instead.
 */
export async function downloadTransactionsCsv(
  filters: TransactionFilters,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(transactionsExportHref(filters), {
      headers: authHeaders(),
    });
  } catch {
    throw new ApiError(
      `Could not reach the API at ${API_ORIGIN}. Make sure the backend is running.`,
      0,
    );
  }

  if (!res.ok) {
    if (res.status === 401) clearSession();
    throw new ApiError(`Export failed (status ${res.status}).`, res.status);
  }

  const disposition = res.headers.get("content-disposition") ?? "";
  const filename = /filename="?([^"]+)"?/.exec(disposition)?.[1] ?? "transactions.csv";
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/* ---------------------------------------------------------------- budgets */

export interface BudgetInput {
  categoryId: number;
  amount: number;
  month: number;
  year: number;
}

export function listBudgets(month: number, year: number): Promise<Budget[]> {
  return request<Budget[]>(`/budgets?${buildQuery({ month, year })}`);
}

export function createBudget(input: BudgetInput): Promise<Budget> {
  return request<Budget>("/budgets", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateBudget(id: number, amount: number): Promise<Budget> {
  return request<Budget>(`/budgets/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ amount }),
  });
}

export function deleteBudget(id: number): Promise<void> {
  return request<void>(`/budgets/${id}`, { method: "DELETE" });
}

/* ---------------------------------------------------------------- reports */

export function getReportSummary(
  month: number,
  year: number,
): Promise<ReportSummary> {
  return request<ReportSummary>(`/reports/summary?${buildQuery({ month, year })}`);
}

export function getCategoryBreakdown(
  month: number,
  year: number,
  type: TransactionType,
): Promise<CategoryBreakdown> {
  return request<CategoryBreakdown>(
    `/reports/category-breakdown?${buildQuery({ month, year, type })}`,
  );
}

export function getMonthlyTrend(months = 6): Promise<MonthlyTrendPoint[]> {
  return request<MonthlyTrendPoint[]>(
    `/reports/monthly-trend?${buildQuery({ months })}`,
  );
}

/* -------------------------------------------------------------- audit logs */

export function listAuditLogs(params: {
  level?: AuditLevel | "";
  page?: number;
  pageSize?: number;
}): Promise<AuditLogsResult> {
  return request<AuditLogsResult>(`/audit-logs?${buildQuery(params)}`);
}

/* ------------------------------------------------------------------- auth */

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ProfileInput {
  name?: string;
  email?: string;
  /** Base64 image data URL, or `null` to remove the current picture. */
  avatar?: string | null;
}

export interface PasswordInput {
  currentPassword: string;
  newPassword: string;
}

export function register(input: RegisterInput): Promise<Session> {
  return request<Session>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function login(input: LoginInput): Promise<Session> {
  return request<Session>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getMe(): Promise<AuthUser> {
  return request<AuthUser>("/auth/me");
}

export function updateProfile(input: ProfileInput): Promise<AuthUser> {
  return request<AuthUser>("/auth/profile", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function changePassword(input: PasswordInput): Promise<void> {
  return request<void>("/auth/password", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
