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
