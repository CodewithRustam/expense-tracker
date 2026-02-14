export interface ApiExpense {
    expenseId?: number;
    roomId: number;
    memberId: number;
    item: string;
    amount: number;
    date: string;
}