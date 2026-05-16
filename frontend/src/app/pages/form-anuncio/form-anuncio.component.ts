import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { AnuncioService } from '../../services/anuncio.service';

@Component({
  selector: 'app-form-anuncio',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, NavbarComponent],
  templateUrl: './form-anuncio.component.html',
  styleUrl: './form-anuncio.component.scss',
})
export class FormAnuncioComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private anuncioService = inject(AnuncioService);

  form!: FormGroup;
  editando = false;
  anuncioId: string | null = null;
  carregando = false;
  salvando = false;
  erro = '';

  get fotos(): FormArray {
    return this.form.get('fotos') as FormArray;
  }

  get fotosPlaceholders(): string[] {
    return this.fotos.controls.map((_, i) => `https://exemplo.com/foto${i + 1}.jpg`);
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

    this.anuncioId = this.route.snapshot.paramMap.get('id');
    if (this.anuncioId) {
      this.editando = true;
      this.carregarAnuncio(this.anuncioId);
    }
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
      next: () => this.router.navigate(['/anuncios']),
      error: (err) => {
        this.erro = err?.error?.erro ?? 'Ocorreu um erro. Tente novamente.';
        this.salvando = false;
      },
    });
  }

  cancelar(): void {
    this.router.navigate(['/anuncios']);
  }
}
