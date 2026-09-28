export enum SplitType {
  Equal = 0,
  Exact = 1,
  Percentage = 2,
  Shares = 3
}

export interface ExpenseSplit {
  memberId: number;
  memberName?: string;
  owedAmount: number;
  percentage?: number;
  shares?: number;
}

export interface ApiExpense {
    expenseId?: number;
    roomId: number;
    memberId: number;
    item: string;
    amount: number;
    date: string;
    splitType?: SplitType;
    splits?: ExpenseSplit[];
}