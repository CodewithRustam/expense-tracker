import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthService } from './auth-service';
import { Group } from '../models/group.model';

@Injectable({
  providedIn: 'root'
})
export class GroupService {

  private baseUrl = 'https://financetracker.runasp.net/api/rooms';

  // 🔥 Global Refresh Stream
  private refreshSubject = new Subject<void>();
  refresh$ = this.refreshSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  private get userId(): string {
    return this.authService.getUserId()!;
  }

  // ================================
  // REFRESH TRIGGER
  // ================================

  triggerRefresh(): void {
    this.refreshSubject.next();
  }

  // ================================
  // API METHODS
  // ================================

  getGroups(): Observable<Group[]> {
    return this.http.get<Group[]>(`${this.baseUrl}/get-rooms`);
  }

  getGroupById(id: number): Observable<Group> {
    return this.http.get<Group>(`${this.baseUrl}/get/${id}`);
  }

  createGroup(group: Partial<Group>): Observable<any> {
    return this.http.post(`${this.baseUrl}/create`, group).pipe(
      tap(() => this.triggerRefresh())
    );
  }

  updateGroup(id: number, group: Partial<Group>): Observable<any> {
    return this.http.put(`${this.baseUrl}/update/${id}`, group).pipe(
      tap(() => this.triggerRefresh())
    );
  }

  deleteGroup(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/delete/${id}`).pipe(
      tap(() => this.triggerRefresh())
    );
  }
}
