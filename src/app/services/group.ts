import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
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


  // 🔥 Global Refresh Stream
  private refreshSubject = new Subject<void>();
  refresh$ = this.refreshSubject.asObservable();

  constructor(
    private apiService: ApiService,
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
    return this.apiService.get<any>(`rooms/get-rooms`);
  }

  getGroupById(id: number, month?: string): Observable<any> {
    const endpoint = month
      ? `rooms/details/${id}?month=${month}`
      : `rooms/details/${id}`;

    return this.apiService.get<any>(endpoint);
  }

  // 🔥 UPDATED CREATE ENDPOINT 🔥
  createGroup(payload: CreateRoomPayload): Observable<any> {
    // Hits: POST /api/rooms/create
    return this.apiService.post<any>(`rooms/create`, payload).pipe(
      tap(() => this.triggerRefresh())
    );
  }

  updateGroup(id: number, group: Partial<Group>): Observable<any> {
    return this.apiService.put<any>(`rooms/update/${id}`, group).pipe(
      tap(() => this.triggerRefresh())
    );
  }

  deleteGroup(id: number): Observable<any> {
    return this.apiService.delete<any>(`rooms/delete/${id}`).pipe(
      tap(() => this.triggerRefresh())
    );
  }
}