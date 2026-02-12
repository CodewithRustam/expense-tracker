import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, throwError } from 'rxjs';
import { AuthService } from './auth-service';
import { catchError, map } from 'rxjs/operators'; // Import map operator
import { Group } from '../models/group.model';

export interface SettlementDetail {
  toMemberId: number;
  toMemberName: string;
  amount: number;
}
export interface Settlement {
  roomId: number;
  payerName: string;
  receiverName: string;
  settlementAmount: number;
  monthLabel: string;
  settlementMonth?: Date | null;
}

export interface ExpenseResponse {
  data: any;
  success: boolean;
  message: string;
}

export interface UserExpenseResponse {
  item: string;
  roomName: string;
  amount: number;
  expenseDate: string;
  iconName: string;
  userId: string;
}


export interface MemberExpenses {
  name: string;
  monthlyExpenses: number[];
}

export interface CategoryExpenses {
  categoryName: string;
  monthlyTotals: number[];
  iconName: string;
}

export interface TopSpend {
  categoryName: string;
  monthlyTotals: number[];
  totalSpent: number;
  iconName: string;
}

export interface MonthlyExpensesTrendResponse {
  months: string[];
  members: MemberExpenses[];
  categoryExpenses: CategoryExpenses[];
  topSpends: TopSpend[];
}
export interface ApiExpense {
  expenseId?: number;  // Optional for ADD (backend generates); required for UPDATE
  roomId: number;
  memberId: number;
  item: string;        // Required
  amount: number;      // Required, >0 (validate client-side)
  date: string;        // ISO string for DateTime
}
export interface AddExpenseResponse {
  success: boolean;
  message: string;
}
@Injectable({
  providedIn: 'root'
})
export class ExpenseService {
  private apiUrl = 'https://financetracker.runasp.net/api/Expenses';
  private refreshChart$ = new Subject<void>();
  private refreshNeeded$ = new Subject<void>();

  constructor(private http: HttpClient, private authService: AuthService) { }

  getExpenseMonths(): Observable<{ success: boolean; message: string; data: string[] }> {
    const url = `${this.apiUrl}/get-userexpesne-months`;
    return this.http.get<{ success: boolean; message: string; data: string[] }>(
      url,
      this.authService.getAuthHeaders()
    );
  }

  getGroups(): Observable<{ success: boolean; data?: Group[] }> {
    return this.http.get<{ success: boolean; data?: Group[] }>(`${this.apiUrl}/groups`);
  }

  getExpenses(roomId: number, month?: string): Observable<ExpenseResponse> {
    let url = `${this.apiUrl}/get-room-expenses?roomId=${roomId}`;
    if (month) {
      url += `&month=${month}`;
    }
    return this.http.get<ExpenseResponse>(url, this.authService.getAuthHeaders());
  }

  addExpense(expense: any): Observable<AddExpenseResponse> {
    return this.http.post<AddExpenseResponse>(
      `${this.apiUrl}/add-expense`,
      expense,
      this.authService.getAuthHeaders()
    ).pipe(
      catchError(err => {
        const errorResponse: AddExpenseResponse = {
          success: false,
          message: err?.error?.message || 'Network error. Please try again.'
        };
        return throwError(() => errorResponse);
      })
    );
  }

  updateExpense(expense: any): Observable<AddExpenseResponse> {
    return this.http.post<AddExpenseResponse>(
      `${this.apiUrl}/update-expense`,
      expense,
      this.authService.getAuthHeaders()
    ).pipe(
      catchError(err => {
        const errorResponse: AddExpenseResponse = {
          success: false,
          message: err?.error?.message || 'Network error. Please try again.'
        };
        return throwError(() => errorResponse);
      })
    );
  }

  getUserExpenses(month: string): Observable<{ userExpenseResponse: UserExpenseResponse[] }> {
    return this.http.get<ExpenseResponse>(
      `${this.apiUrl}/get-user-expenses?month=${month}`,
      this.authService.getAuthHeaders()
    ).pipe(
      map((response) => ({
        userExpenseResponse: response.data as UserExpenseResponse[]
      }))
    );
  }

  getMonthlyExpensesTrend(roomId: number, month: string): Observable<MonthlyExpensesTrendResponse> {
    return this.http
      .get<{ data: MonthlyExpensesTrendResponse }>(
        `${this.apiUrl}/trend-expenses?roomId=${roomId}&month=${month}`,
        this.authService.getAuthHeaders()
      )
      .pipe(
        map(response => response.data)
      );
  }

  getSettlementDetails(roomId: number, memberId: number, month?: string): Observable<{ success: boolean; data?: { netBalance: number; settlements: SettlementDetail[] }; message?: string }> {
    let url = `${this.apiUrl}/get-settlement-details?roomId=${roomId}&memberId=${memberId}`;
    if (month) {
      url += `&month=${month}`;
    }
    return this.http.get<{ success: boolean; data?: { netBalance: number; settlements: SettlementDetail[] }; message?: string }>(url);
  }

  settleBalance(selectedMember: SettlementDetail, roomId: number, payerName: string, monthLabel: string): Observable<any> {
    const settlementPayload = {
      roomId: roomId,
      payerName: payerName,
      receiverName: selectedMember.toMemberName,
      settlementAmount: selectedMember.amount,
      monthLabel: monthLabel,
      settlementMonth: new Date()
    };
    return this.http.post<any>(
      `${this.apiUrl}/expenses-settle`,
      settlementPayload,
      this.authService.getAuthHeaders()
    );
  }

  // Inside ExpenseService
  deleteExpense(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.apiUrl}/delete-expense/${id}`,
      this.authService.getAuthHeaders()
    ).pipe(
      catchError(err => {
        return throwError(() => ({
          success: false,
          message: err?.error?.message || 'Failed to delete expense'
        }));
      })
    );
  }

  getRoomTrend(roomId: number) {
    return this.http.get<any>(`${this.apiUrl}/trend-home-expenses?roomId=${roomId}`);
  }

  triggerChartRefresh() {
    this.refreshChart$.next();
  }

  onChartRefresh(): Observable<void> {
    return this.refreshChart$.asObservable();
  }

  get refreshNeeded() {
    return this.refreshNeeded$;
  }

  // Call this method after any Add, Update, or Delete API call succeeds
  notifyDataChanged() {
    this.refreshNeeded$.next();
  }
}