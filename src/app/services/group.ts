import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { Group } from '../models/group.model';
import { AuthService } from './auth-service';

@Injectable({
  providedIn: 'root'
})
export class GroupService {
  private apiUrl = 'https://financetracker.runasp.net/api/rooms/get-rooms';

  private refreshGroupsSource = new Subject<void>();
  refreshGroups$ = this.refreshGroupsSource.asObservable();

  constructor(private http: HttpClient, private authService: AuthService) { }

  triggerRefresh() {
    this.refreshGroupsSource.next();
  }

  getGroups(): Observable<{ data: Group[], success: boolean, message: string }> {
    return this.http.get<{ data: Group[], success: boolean, message: string }>(
      this.apiUrl,
      this.authService.getAuthHeaders()
    );
  }

  getGroupById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  addGroup(group: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, group);
  }

  updateGroup(id: number, group: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, group);
  }

  deleteGroup(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  addGroupWithRefresh(group: any): Observable<any> {
    return new Observable(observer => {
      this.http.post<any>(this.apiUrl, group).subscribe({
        next: (res) => {
          if (res.success) this.triggerRefresh();
          observer.next(res);
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }
}
