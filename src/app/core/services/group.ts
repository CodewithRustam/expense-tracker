import { Injectable, signal, computed } from '@angular/core';
import { ApiService } from './api.service';
import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthService } from './auth-service';
import { Group } from '../models/group.model'; 

export interface InviteMemberPayload {
  name: string;
  email: string;
}

export interface CreateRoomPayload {
  name: string;
  members: InviteMemberPayload[];
}

export interface AddMemberPayload {
  roomId: number;
  name: string;
  email: string;
}

interface GroupState {
  groups: Group[];
  isLoading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class GroupService {

  // ✅ Modern Signal State
  private state = signal<GroupState>({
    groups: [],
    isLoading: false,
    error: null
  });

  // ✅ Public computed signals for components to consume
  public groups = computed(() => this.state().groups);
  public isLoading = computed(() => this.state().isLoading);
  public error = computed(() => this.state().error);

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {
    this.authService.logout$.subscribe(() => {
      this.clearState();
    });
  }

  // ================================
  // STATE MANAGEMENT
  // ================================

  public clearState(): void {
    this.state.set({
      groups: [],
      isLoading: false,
      error: null
    });
  }

  // Global Refresh Stream (Backward Compatibility during migration)
  private refreshSubject = new Subject<void>();
  public refresh$ = this.refreshSubject.asObservable();

  public loadGroups(): void {
    this.state.update(s => ({ ...s, isLoading: true, error: null }));
    
    this.apiService.get<any>(`rooms/get-rooms`).subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : res.data;
        const success = Array.isArray(res) ? true : res.success;
        if (success) {
          this.state.update(s => ({ ...s, groups: data || [], isLoading: false }));
        } else {
          this.state.update(s => ({ ...s, isLoading: false, error: 'Failed to load groups' }));
        }
      },
      error: (err) => {
        this.state.update(s => ({ ...s, isLoading: false, error: err.message || 'Error loading groups' }));
      }
    });
  }

  // ✅ Trigger a reload of state and notify listeners
  public triggerRefresh(): void {
    this.refreshSubject.next();
    this.loadGroups();
  }

  // ================================
  // API METHODS
  // ================================

  getGroups(): Observable<any> {
    return this.apiService.get<any>(`rooms/get-rooms`);
  }

  getGroupById(id: number, month?: string): Observable<any> {
    const endpoint = month ? `rooms/details/${id}?month=${month}` : `rooms/details/${id}`;
    return this.apiService.get<any>(endpoint);
  }

  createGroup(payload: CreateRoomPayload): Observable<any> {
    return this.apiService.post<any>(`rooms/create`, payload).pipe(
      tap(() => this.triggerRefresh())
    );
  }

  updateGroup(id: number, group: Partial<Group>): Observable<any> {
    return this.apiService.put<any>(`rooms/update/${id}`, group).pipe(
      tap(() => this.triggerRefresh())
    );
  }

  addMember(payload: AddMemberPayload): Observable<any> {
    return this.apiService.post<any>(`rooms/add-member`, payload).pipe(
      tap(() => this.triggerRefresh())
    );
  }

  removeMember(roomId: number, memberId: number): Observable<any> {
    return this.apiService.delete<any>(`rooms/remove-member/${roomId}/${memberId}`).pipe(
      tap(() => this.triggerRefresh())
    );
  }

  deleteGroup(roomId: number): Observable<any> {
    return this.apiService.delete<any>(`rooms/delete/${roomId}`).pipe(
      tap(() => this.triggerRefresh())
    );
  }
}