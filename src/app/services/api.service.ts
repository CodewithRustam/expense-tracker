import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Generic GET method
   */
  get<T>(endpoint: string, options?: any): Observable<T> {
    return this.http.get<T>(`${this.apiUrl}/${endpoint}`, options as any).pipe(
      catchError(this.handleError())
    ) as Observable<T>;
  }

  /**
   * Generic POST method
   */
  post<T>(endpoint: string, body: any, options?: any): Observable<T> {
    return this.http.post<T>(`${this.apiUrl}/${endpoint}`, body, options as any).pipe(
      catchError(this.handleError())
    ) as Observable<T>;
  }

  /**
   * Generic PUT method
   */
  put<T>(endpoint: string, body: any, options?: any): Observable<T> {
    return this.http.put<T>(`${this.apiUrl}/${endpoint}`, body, options as any).pipe(
      catchError(this.handleError())
    ) as Observable<T>;
  }

  /**
   * Generic DELETE method
   */
  delete<T>(endpoint: string, options?: any): Observable<T> {
    return this.http.delete<T>(`${this.apiUrl}/${endpoint}`, options as any).pipe(
      catchError(this.handleError())
    ) as Observable<T>;
  }

  /**
   * Centralized error handling
   * This formats the error so consumers receive a consistent { success: false, message: string } structure
   */
  private handleError() {
    return (error: any) => {
      let errorMessage = 'An unknown error occurred!';
      
      // Client-side or network error
      if (error.error instanceof ErrorEvent) {
        errorMessage = `Error: ${error.error.message}`;
      } else {
        // Backend error (e.g. 400 Bad Request, 500 Internal Server Error)
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        } else {
          errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
        }
      }
      
      console.error('ApiService Error:', error);
      
      return throwError(() => ({
        success: false,
        message: errorMessage,
        originalError: error
      }));
    };
  }
}
