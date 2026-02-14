import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, throwError } from 'rxjs';
import { AuthService } from './auth-service';
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
  private apiUrl = 'https://financetracker.runasp.net/api/Expenses';

  // ✅ Single Global Refresh Stream
  private refreshSubject = new Subject<void>();
  refresh$ = this.refreshSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
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
    return this.http.get<{ success: boolean; message: string; data: string[] }>(
      `${this.apiUrl}/get-userexpesne-months`,
      this.authService.getAuthHeaders()
    );
  }

  getGroups(): Observable<{ success: boolean; data?: Group[] }> {
    return this.http.get<{ success: boolean; data?: Group[] }>(
      `${this.apiUrl}/groups`,
      this.authService.getAuthHeaders()
    );
  }

  getExpenses(roomId: number, month?: string): Observable<ExpenseResponse> {
    let url = `${this.apiUrl}/get-room-expenses?roomId=${roomId}`;
    if (month) url += `&month=${month}`;

    return this.http.get<ExpenseResponse>(url, this.authService.getAuthHeaders());
  }

  addExpense(expense: ApiExpense): Observable<AddExpenseResponse> {
    return this.http.post<AddExpenseResponse>(
      `${this.apiUrl}/add-expense`,
      expense,
      this.authService.getAuthHeaders()
    ).pipe(
      tap(() => this.triggerRefresh()),
      catchError(this.handleError('Network error. Please try again.'))
    );
  }

  updateExpense(expense: ApiExpense): Observable<AddExpenseResponse> {
    return this.http.post<AddExpenseResponse>(
      `${this.apiUrl}/update-expense`,
      expense,
      this.authService.getAuthHeaders()
    ).pipe(
      tap(() => this.triggerRefresh()),
      catchError(this.handleError('Failed to update expense.'))
    );
  }

  deleteExpense(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.apiUrl}/delete-expense/${id}`,
      this.authService.getAuthHeaders()
    ).pipe(
      tap(() => this.triggerRefresh()),
      catchError(this.handleError('Failed to delete expense.'))
    );
  }

  getUserExpenses(month: string): Observable<{ userExpenseResponse: UserExpenseResponse[] }> {
    return this.http.get<ExpenseResponse>(
      `${this.apiUrl}/get-user-expenses?month=${month}`,
      this.authService.getAuthHeaders()
    ).pipe(
      map(response => ({
        userExpenseResponse: response.data as UserExpenseResponse[]
      }))
    );
  }

  getMonthlyExpensesTrend(roomId: number, month: string): Observable<MonthlyExpensesTrendResponse> {
    return this.http.get<{ data: MonthlyExpensesTrendResponse }>(
      `${this.apiUrl}/trend-expenses?roomId=${roomId}&month=${month}`,
      this.authService.getAuthHeaders()
    ).pipe(
      map(response => response.data)
    );
  }

  getSettlementDetails(roomId: number, memberId: number, month?: string): Observable<any> {
    let url = `${this.apiUrl}/get-settlement-details?roomId=${roomId}&memberId=${memberId}`;
    if (month) url += `&month=${month}`;

    return this.http.get<any>(url, this.authService.getAuthHeaders());
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

    return this.http.post<any>(
      `${this.apiUrl}/expenses-settle`,
      payload,
      this.authService.getAuthHeaders()
    ).pipe(
      tap(() => this.triggerRefresh()),
      catchError(this.handleError('Settlement failed.'))
    );
  }

  getRoomTrend(roomId: number): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/trend-home-expenses?roomId=${roomId}`,
      this.authService.getAuthHeaders()
    );
  }
}

export { MonthlyExpensesTrendResponse };
