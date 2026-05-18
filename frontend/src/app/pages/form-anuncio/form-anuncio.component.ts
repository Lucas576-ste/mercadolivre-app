import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { AnuncioService, AtributoSugerido, CategoriaSugerida } from '../../services/anuncio.service';
import { ToastService } from '../../services/toast.service';
import { UploadService } from '../../services/upload.service';

@Component({
  selector: 'app-form-anuncio',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, NavbarComponent],
  templateUrl: './form-anuncio.component.html',
  styleUrl: './form-anuncio.component.scss',
})
export class FormAnuncioComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private anuncioService = inject(AnuncioService);
  private uploadService = inject(UploadService);
  private toast = inject(ToastService);
  private destroy$ = new Subject<void>();

  form!: FormGroup;
  editando = false;
  anuncioId: string | null = null;
  carregando = false;
  salvando = false;
  erro = '';

  // Categoria sugerida
  detectandoCategoria = false;
  categoriaSugerida: CategoriaSugerida | null = null;

  // Upload de fotos
  uploadandoFoto = new Set<number>();

  get fotos(): FormArray {
    return this.form.get('fotos') as FormArray;
  }

  get fotosPlaceholders(): string[] {
    return this.fotos.controls.map((_, i) => `https://exemplo.com/foto${i + 1}.jpg`);
  }

  get atributos(): AtributoSugerido[] {
    return this.categoriaSugerida?.atributos ?? [];
  }

  resumoValores(attr: AtributoSugerido): string {
    if (!attr.valores || attr.valores.length === 0) return '';
    const nomes = attr.valores.slice(0, 3).map(v => v.nome).join(', ');
    return attr.valores.length > 3 ? `${nomes}...` : nomes;
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      titulo:    ['', Validators.required],
      descricao: [''],
      categoria: ['', Validators.required],
      condicao:  ['new'],
      preco:     [null, [Validators.required, Validators.min(0.01)]],
      estoque:   [null, [Validators.required, Validators.min(0)]],
      fotos:     this.fb.array([this.fb.control(''), this.fb.control(''), this.fb.control('')]),
    });

    // Detecção automática de categoria ao digitar o título
    this.form.get('titulo')!.valueChanges.pipe(
      debounceTime(750),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe((titulo: string) => {
      if (titulo && titulo.trim().length >= 5) {
        this.detectarCategoria(titulo.trim());
      } else {
        this.categoriaSugerida = null;
      }
    });

    this.anuncioId = this.route.snapshot.paramMap.get('id');
    if (this.anuncioId) {
      this.editando = true;
      this.carregarAnuncio(this.anuncioId);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  detectarCategoria(titulo: string): void {
    this.detectandoCategoria = true;
    this.anuncioService.sugerirCategoria(titulo).subscribe({
      next: (res) => {
        this.detectandoCategoria = false;
        if (res.category_id) {
          this.categoriaSugerida = res;
          // Pré-seleciona a categoria no dropdown
          this.form.get('categoria')!.setValue(res.category_id);
        } else {
          this.categoriaSugerida = null;
        }
      },
      error: () => {
        this.detectandoCategoria = false;
        this.categoriaSugerida = null;
      },
    });
  }

  carregarAnuncio(id: string): void {
    this.carregando = true;
    this.anuncioService.getAnuncioById(id).subscribe({
      next: (anuncio) => {
        const fotos = anuncio.fotos ?? [];
        while (this.fotos.length < Math.max(fotos.length, 3)) {
          this.fotos.push(this.fb.control(''));
        }
        this.form.patchValue({
          titulo:    anuncio.titulo,
          descricao: anuncio.descricao ?? '',
          categoria: anuncio.categoria,
          condicao:  anuncio.condicao,
          preco:     anuncio.preco,
          estoque:   anuncio.estoque,
        });
        fotos.forEach((url, i) => this.fotos.at(i).setValue(url));
        this.carregando = false;
      },
      error: () => {
        this.erro = 'Não foi possível carregar o anúncio.';
        this.carregando = false;
      },
    });
  }

  adicionarFoto(): void {
    this.fotos.push(this.fb.control(''));
  }

  selecionarArquivo(index: number): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,image/gif';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) this.fazerUpload(file, index);
    };
    input.click();
  }

  fazerUpload(file: File, index: number): void {
    if (file.size > 5 * 1024 * 1024) {
      this.toast.erro('Arquivo muito grande. Máximo 5MB.');
      return;
    }
    this.uploadandoFoto.add(index);
    this.uploadService.uploadImagem(file).subscribe({
      next: ({ url }) => {
        this.fotos.at(index).setValue(url);
        this.uploadandoFoto.delete(index);
        this.toast.sucesso('Foto carregada com sucesso!');
      },
      error: (err) => {
        this.uploadandoFoto.delete(index);
        this.toast.erro(err?.error?.erro ?? 'Erro ao fazer upload da foto.');
      },
    });
  }

  removerFoto(index: number): void {
    if (this.fotos.length > 1) {
      this.fotos.removeAt(index);
    } else {
      this.fotos.at(0).setValue('');
    }
  }

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.salvando = true;
    this.erro = '';

    const raw = this.form.value;
    const payload = {
      ...raw,
      fotos: (raw.fotos as string[]).filter((u: string) => u.trim() !== ''),
    };

    const req = this.editando && this.anuncioId
      ? this.anuncioService.editarAnuncio(this.anuncioId, payload)
      : this.anuncioService.criarAnuncio(payload);

    req.subscribe({
      next: () => {
        this.toast.sucesso(this.editando ? 'Anúncio atualizado com sucesso!' : 'Anúncio criado com sucesso!');
        this.router.navigate(['/anuncios']);
      },
      error: (err) => {
        this.erro = err?.error?.erro ?? 'Ocorreu um erro. Tente novamente.';
        this.toast.erro(this.erro);
        this.salvando = false;
      },
    });
  }

  cancelar(): void {
    this.router.navigate(['/anuncios']);
  }
}
