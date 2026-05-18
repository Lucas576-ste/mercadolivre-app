import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AtributoValor {
  id: string;
  value_id?: string;
  value_name: string;
}

export interface AnuncioPayload {
  titulo: string;
  descricao?: string;
  categoria: string;
  condicao: string;
  preco: number;
  estoque: number;
  fotos?: string[];
  atributos?: AtributoValor[];
}

export interface Anuncio extends AnuncioPayload {
  _id: string;
  ml_id?: string;
  status: string;
  categoria_nome?: string;
  permalink?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListagemParams {
  titulo?: string;
  status?: string;
  categoria?: string;
  page?: number;
  limit?: number;
}

export interface ListagemResponse {
  anuncios: Anuncio[];
  total: number;
  pagina: number;
  limite: number;
}

export interface AtributoSugerido {
  id: string;
  nome: string;
  tipo: string;
  valores: { id: string; nome: string }[] | null;
}

export interface CategoriaSugerida {
  category_id: string | null;
  category_name: string | null;
  atributos: AtributoSugerido[];
}

@Injectable({ providedIn: 'root' })
export class AnuncioService {
  private readonly base = `${environment.apiUrl}/anuncios`;
  private readonly categoriasBase = `${environment.apiUrl}/categorias`;

  constructor(private http: HttpClient) {}

  getAnuncioById(id: string): Observable<Anuncio> {
    return this.http.get<Anuncio>(`${this.base}/${id}`);
  }

  criarAnuncio(data: AnuncioPayload): Observable<Anuncio> {
    return this.http.post<Anuncio>(this.base, data);
  }

  editarAnuncio(id: string, data: Partial<AnuncioPayload>): Observable<Anuncio> {
    return this.http.put<Anuncio>(`${this.base}/${id}`, data);
  }

  listarAnuncios(filtros: ListagemParams = {}): Observable<ListagemResponse> {
    let params = new HttpParams();
    if (filtros.titulo)    params = params.set('busca', filtros.titulo);
    if (filtros.status)    params = params.set('status', filtros.status);
    if (filtros.categoria) params = params.set('categoria', filtros.categoria);
    if (filtros.page)      params = params.set('pagina', String(filtros.page));
    if (filtros.limit)     params = params.set('limite', String(filtros.limit));
    return this.http.get<ListagemResponse>(this.base, { params });
  }

  sincronizar(): Observable<{ mensagem: string; sincronizados: number }> {
    return this.http.post<{ mensagem: string; sincronizados: number }>(
      `${this.base}/sincronizar`, {}
    );
  }

  atualizarPreco(id: string, preco: number): Observable<Anuncio> {
    return this.http.patch<Anuncio>(`${this.base}/${id}/preco`, { preco });
  }

  atualizarEstoque(id: string, estoque: number): Observable<Anuncio> {
    return this.http.patch<Anuncio>(`${this.base}/${id}/estoque`, { estoque });
  }

  sugerirCategoria(titulo: string): Observable<CategoriaSugerida> {
    const params = new HttpParams().set('titulo', titulo);
    return this.http.get<CategoriaSugerida>(`${this.categoriasBase}/sugerir`, { params });
  }

  buscarAtributos(categoryId: string): Observable<AtributoSugerido[]> {
    return this.http.get<AtributoSugerido[]>(`${this.categoriasBase}/${categoryId}/atributos`);
  }

  alterarStatus(id: string, status: 'active' | 'paused'): Observable<Anuncio> {
    return this.http.patch<Anuncio>(`${this.base}/${id}/status`, { status });
  }

  excluirAnuncio(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  listarCategorias(): Observable<{ id: string; nome: string | null }[]> {
    return this.http.get<{ id: string; nome: string | null }[]>(`${this.base}/categorias`);
  }
}
