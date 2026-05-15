import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly base = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient, private router: Router) {}

  verificarStatus(): Observable<boolean> {
    return this.http.get<{ autenticado: boolean }>(`${this.base}/status`).pipe(
      map((res) => res.autenticado),
      catchError(() => of(false))
    );
  }

  logout(): void {
    this.http.post(`${this.base}/logout`, {}).subscribe({
      complete: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }
}
