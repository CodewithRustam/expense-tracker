import { CategoryExpenses } from "./CategoryExpenses";
import { MemberExpenses } from "./MemberExpenses";
import { TopSpend } from "./TopSpend";

export interface MonthlyExpensesTrendResponse {
    months: string[];
    members: MemberExpenses[];
    categoryExpenses: CategoryExpenses[];
    topSpends: TopSpend[];
}