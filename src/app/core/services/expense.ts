import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable, Subject, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Group } from '../models/group.model';
import { AddExpenseResponse } from '../models/Expense/AddExpenseResponse';
import { ApiExpense } from '../models/Expense/ApiExpense';
import { ExpenseResponse } from '../models/Expense/ExpenseResponse';
import { MonthlyExpensesTrendResponse } from '../models/Expense/MonthlyExpensesTrendResponse';
import { UserExpenseResponse } from '../models/Expense/UserExpenseResponse';
import { Settlement } from '../models/Settlement/Settlement';
import { SettlementDetail } from '../models/Settlement/SettlementDetail';

@Injectable({
  providedIn: 'root'
})
export class ExpenseService {

  // ✅ Single Global Refresh Stream
  private refreshSubject = new Subject<void>();
  refresh$ = this.refreshSubject.asObservable();

  constructor(
    private apiService: ApiService
  ) { }

  // =====================================
  // Helpers
  // =====================================

  private handleError(defaultMessage: string) {
    return (err: any) => {
      return throwError(() => ({
        success: false,
        message: err?.error?.message || defaultMessage
      }));
    };
  }

  private triggerRefresh() {
    this.refreshSubject.next();
  }

  // =====================================
  // API Methods
  // =====================================

  getExpenseMonths(): Observable<{ success: boolean; message: string; data: string[] }> {
    return this.apiService.get<{ success: boolean; message: string; data: string[] }>(
      `Expenses/get-userexpesne-months`
    );
  }

  getGroups(): Observable<{ success: boolean; data?: Group[] }> {
    return this.apiService.get<{ success: boolean; data?: Group[] }>(
      `Expenses/groups`
    );
  }

  getExpenses(roomId: number, month?: string): Observable<ExpenseResponse> {
    let url = `Expenses/get-room-expenses?roomId=${roomId}`;
    if (month) url += `&month=${month}`;

    return this.apiService.get<ExpenseResponse>(url);
  }

  addExpense(expense: ApiExpense): Observable<AddExpenseResponse> {
    return this.apiService.post<AddExpenseResponse>(
      `Expenses/add-expense`,
      expense
    ).pipe(
      tap(() => this.triggerRefresh()),
      catchError(this.handleError('Network error. Please try again.'))
    );
  }

  updateExpense(expense: ApiExpense): Observable<AddExpenseResponse> {
    return this.apiService.post<AddExpenseResponse>(
      `Expenses/update-expense`,
      expense
    ).pipe(
      tap(() => this.triggerRefresh()),
      catchError(this.handleError('Failed to update expense.'))
    );
  }

  deleteExpense(id: number): Observable<{ success: boolean; message: string }> {
    return this.apiService.delete<{ success: boolean; message: string }>(
      `Expenses/delete-expense/${id}`
    ).pipe(
      tap(() => this.triggerRefresh()),
      catchError(this.handleError('Failed to delete expense.'))
    );
  }

  getUserExpenses(month: string): Observable<{ userExpenseResponse: UserExpenseResponse[] }> {
    return this.apiService.get<ExpenseResponse>(
      `Expenses/get-user-expenses?month=${month}`
    ).pipe(
      map(response => ({
        userExpenseResponse: response.data as UserExpenseResponse[]
      }))
    );
  }

  getMonthlyExpensesTrend(roomId: number, month: string): Observable<MonthlyExpensesTrendResponse> {
    return this.apiService.get<{ data: MonthlyExpensesTrendResponse }>(
      `Expenses/trend-expenses?roomId=${roomId}&month=${month}`
    ).pipe(
      map(response => response.data)
    );
  }

  getSettlementDetails(roomId: number, memberId: number, month?: string): Observable<any> {
    let url = `Expenses/get-settlement-details?roomId=${roomId}&memberId=${memberId}`;
    if (month) url += `&month=${month}`;

    return this.apiService.get<any>(url);
  }

  settleBalance(selectedMember: SettlementDetail, roomId: number, payerName: string, monthLabel: string): Observable<any> {
    const payload: Settlement = {
      roomId: roomId,
      payerName: payerName,
      receiverName: selectedMember.toMemberName,
      settlementAmount: selectedMember.amount,
      monthLabel: monthLabel,
      settlementMonth: new Date()
    };

    return this.apiService.post<any>(
      `Expenses/expenses-settle`,
      payload
    ).pipe(
      tap(() => this.triggerRefresh()),
      catchError(this.handleError('Settlement failed.'))
    );
  }

  getRoomTrend(roomId: number): Observable<any> {
    return this.apiService.get<any>(
      `Expenses/trend-home-expenses?roomId=${roomId}`
    );
  }
}

export { MonthlyExpensesTrendResponse };