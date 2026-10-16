export type NaturalBalanceSide = "debit" | "credit";

/** Put signed balance in the correct debit or credit column (no negative Rs in a column). */
export function splitTrialBalanceAmount(
  amount: number,
  naturalSide: NaturalBalanceSide
): { debit: number; credit: number } {
  const n = Number(amount) || 0;
  if (naturalSide === "debit") {
    if (n >= 0) return { debit: n, credit: 0 };
    return { debit: 0, credit: Math.abs(n) };
  }
  if (n >= 0) return { debit: 0, credit: n };
  return { debit: Math.abs(n), credit: 0 };
}

export function formatTrialBalanceCells(debit: number, credit: number): {
  debitLabel: string;
  creditLabel: string;
} {
  const d = Math.round(debit * 100) / 100;
  const c = Math.round(credit * 100) / 100;
  return {
    debitLabel: d > 0 ? `Rs ${d.toLocaleString()}` : "-",
    creditLabel: c > 0 ? `Rs ${c.toLocaleString()}` : "-",
  };
}

export type TrialBalanceInput = {
  cashBalances: number[];
  receivable: number;
  payable: number;
  inventory: number;
  fixedAssets: number;
  sales: number;
  purchases: number;
  expenses: number;
};

export type TrialBalanceResult = {
  totalAssets: number;
  totalLiabilities: number;
  totalExpenses: number;
  totalRevenue: number;
  ownersEquity: number;
  sumDebits: number;
  sumCredits: number;
  isBalanced: boolean;
};

export function calculateTrialBalance(input: TrialBalanceInput): TrialBalanceResult {
  const cashTotal = input.cashBalances.reduce((s, v) => s + Number(v || 0), 0);
  const totalAssets = cashTotal + input.receivable + input.inventory + input.fixedAssets;
  const totalLiabilities = input.payable;
  const totalExpenses = input.purchases + input.expenses;
  const totalRevenue = input.sales;

  // Plug equity so debits = credits (standard trial balance)
  const ownersEquity = totalAssets + totalExpenses - totalLiabilities - totalRevenue;
  const sumDebits = totalAssets + totalExpenses;
  const sumCredits = totalLiabilities + ownersEquity + totalRevenue;

  return {
    totalAssets,
    totalLiabilities,
    totalExpenses,
    totalRevenue,
    ownersEquity,
    sumDebits,
    sumCredits,
    isBalanced: Math.abs(sumDebits - sumCredits) < 0.01,
  };
}
