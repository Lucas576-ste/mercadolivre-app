import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AnuncioService } from '../../services/anuncio.service';

@Component({
  selector: 'app-modal-preco',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './modal-preco.component.html',
  styleUrl: './modal-preco.component.scss',
})
export class ModalPrecoComponent implements OnInit {
  @Input() anuncio: any;
  @Input() visivel = false;
  @Output() fechar = new EventEmitter<void>();
  @Output() salvo = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private service = inject(AnuncioService);

  form!: FormGroup;
  salvando = false;
  erro = '';

  get precoFormatado(): string {
    return (this.anuncio?.preco ?? 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      novoPreco: [null, [Validators.required, Validators.min(0.01)]],
    });
  }

  confirmar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.salvando = true;
    this.erro = '';
    this.service.atualizarPreco(this.anuncio._id, Number(this.form.value.novoPreco)).subscribe({
      next: () => {
        this.salvando = false;
        this.salvo.emit();
        this.fechar.emit();
      },
      error: () => {
        this.erro = 'Erro ao atualizar preço.';
        this.salvando = false;
      },
    });
  }
}
