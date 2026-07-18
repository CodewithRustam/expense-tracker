import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthService } from './auth-service';
import { Group } from '../models/group.model'; // You might need to update this model to match RoomResponse

// 1. Interfaces matching your C# RoomViewModel & InviteMemberViewModel
export interface InviteMemberPayload {
  name: string;
  email: string;
}

export interface CreateRoomPayload {
  name: string;
  members: InviteMemberPayload[];
}

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

  // ================================
  // REFRESH TRIGGER
  // ================================

  triggerRefresh(): void {
    this.refreshSubject.next();
  }

  // ================================
  // API METHODS
  // ================================

  getGroups(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/get-rooms`);
  }

  getGroupById(id: number, month?: string): Observable<any> {
    const url = month
      ? `${this.baseUrl}/details/${id}?month=${month}`
      : `${this.baseUrl}/details/${id}`;

    return this.http.get<any>(url);
  }

  // 🔥 UPDATED CREATE ENDPOINT 🔥
  createGroup(payload: CreateRoomPayload): Observable<any> {
    // Hits: POST /api/rooms/create
    return this.http.post(`${this.baseUrl}/create`, payload).pipe(
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