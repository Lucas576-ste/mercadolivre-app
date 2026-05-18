import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly base = `${environment.apiUrl}/upload`;

  constructor(private http: HttpClient) {}

  uploadImagem(file: File): Observable<{ url: string }> {
    const form = new FormData();
    form.append('imagem', file);
    return this.http.post<{ url: string }>(this.base, form);
  }
}
