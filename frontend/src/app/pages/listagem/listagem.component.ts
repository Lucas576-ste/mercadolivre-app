import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { ModalPrecoComponent } from '../../components/modal-preco/modal-preco.component';
import { ModalEstoqueComponent } from '../../components/modal-estoque/modal-estoque.component';
import { Anuncio, AnuncioService } from '../../services/anuncio.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-listagem',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, ModalPrecoComponent, ModalEstoqueComponent],
  templateUrl: './listagem.component.html',
  styleUrl: './listagem.component.scss',
})
export class ListagemComponent implements OnInit, OnDestroy {
  private service = inject(AnuncioService);
  private toast = inject(ToastService);
  router = inject(Router);
  private destroy$ = new Subject<void>();
  private buscaSubject = new Subject<string>();

  anuncios: Anuncio[] = [];
  total = 0;
  carregando = false;
  sincronizando = false;

  termoBusca = '';
  statusFiltro = '';
  categoriaFiltro = '';
  paginaAtual = 1;
  readonly limite = 5;

  anuncioModalPreco: Anuncio | null = null;
  anuncioModalEstoque: Anuncio | null = null;

  get totalPaginas(): number { return Math.ceil(this.total / this.limite); }
  get inicio(): number { return this.total === 0 ? 0 : (this.paginaAtual - 1) * this.limite + 1; }
  get fim(): number { return Math.min(this.paginaAtual * this.limite, this.total); }

  get paginas(): (number | '...')[] {
    const total = this.totalPaginas;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const p = this.paginaAtual;
    const pages: (number | '...')[] = [1];
    if (p > 3) pages.push('...');
    for (let i = Math.max(2, p - 1); i <= Math.min(total - 1, p + 1); i++) pages.push(i);
    if (p < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  }

  ngOnInit(): void {
    this.buscaSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => { this.paginaAtual = 1; this.carregar(); });
    this.carregar();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  carregar(): void {
    this.carregando = true;
    this.service.listarAnuncios({
      titulo: this.termoBusca || undefined,
      status: this.statusFiltro || undefined,
      categoria: this.categoriaFiltro || undefined,
      page: this.paginaAtual,
      limit: this.limite,
    }).subscribe({
      next: (res) => { this.anuncios = res.anuncios; this.total = res.total; this.carregando = false; },
      error: () => { this.toast.erro('Erro ao carregar anúncios.'); this.carregando = false; },
    });
  }

  onBuscaChange(): void { this.buscaSubject.next(this.termoBusca); }
  onFiltroChange(): void { this.paginaAtual = 1; this.carregar(); }

  irParaPagina(p: number | '...'): void {
    if (p === '...' || p === this.paginaAtual) return;
    this.paginaAtual = p as number;
    this.carregar();
  }

  sincronizar(): void {
    this.sincronizando = true;
    this.service.sincronizar().subscribe({
      next: (res) => { this.toast.sucesso(`${res.sincronizados} anúncio(s) sincronizado(s).`); this.sincronizando = false; this.carregar(); },
      error: () => { this.toast.erro('Erro ao sincronizar.'); this.sincronizando = false; },
    });
  }

  alterandoStatus = new Set<string>();

  abrirModalPreco(a: Anuncio): void { this.anuncioModalPreco = a; }
  abrirModalEstoque(a: Anuncio): void { this.anuncioModalEstoque = a; }

  onModalPrecoSalvo(): void { this.anuncioModalPreco = null; this.carregar(); }
  onModalEstoqueSalvo(): void { this.anuncioModalEstoque = null; this.carregar(); }

  alterarStatus(a: Anuncio): void {
    if (this.alterandoStatus.has(a._id)) return;
    const novoStatus: 'active' | 'paused' = a.status === 'active' ? 'paused' : 'active';
    this.alterandoStatus.add(a._id);
    this.service.alterarStatus(a._id, novoStatus).subscribe({
      next: () => {
        this.alterandoStatus.delete(a._id);
        const label = novoStatus === 'paused' ? 'Anúncio pausado.' : 'Anúncio reativado.';
        this.toast.sucesso(label);
        this.carregar();
      },
      error: (err) => {
        this.alterandoStatus.delete(a._id);
        this.toast.erro(err?.error?.erro ?? 'Erro ao alterar status.');
      },
    });
  }

  formatarPreco(v: number): string {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  labelCategoria(cat: string): string {
    const map: Record<string, string> = {
      // ML category IDs (Brazil)
      MLB1000: 'Eletrônicos, Áudio e Vídeo',
      MLB1276: 'Informática',
      MLB1144: 'Celulares e Telefones',
      MLB5672: 'Esportes e Fitness',
      MLB1574: 'Casa, Móveis e Decoração',
      MLB1430: 'Moda e Acessórios',
      MLB1743: 'Veículos e Peças',
      MLB1499: 'Ferramentas e Construção',
      MLB1648: 'Brinquedos e Hobbies',
      MLB1051: 'Beleza e Cuidado Pessoal',
      MLB1132: 'Livros, Revistas e Comics',
      MLB1953: 'Alimentos e Bebidas',
      MLB3937: 'Animais e Mascotas',
      MLB1039: 'Arte, Artesanato e Costura',
      MLB1168: 'Música e Shows',
      // Legacy slug keys (backward compat)
      eletronicos: 'Eletrônicos',
      esportes: 'Esportes',
      'casa-jardim': 'Casa e Jardim',
      moda: 'Moda',
      veiculos: 'Veículos',
      outros: 'Outros',
    };
    return map[cat] ?? cat;
  }
}
