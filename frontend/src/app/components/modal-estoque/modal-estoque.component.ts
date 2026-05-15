import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AnuncioService } from '../../services/anuncio.service';

@Component({
  selector: 'app-modal-estoque',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './modal-estoque.component.html',
  styleUrl: './modal-estoque.component.scss',
})
export class ModalEstoqueComponent implements OnInit {
  @Input() anuncio: any;
  @Input() visivel = false;
  @Output() fechar = new EventEmitter<void>();
  @Output() salvo = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private service = inject(AnuncioService);

  form!: FormGroup;
  salvando = false;
  erro = '';

  ngOnInit(): void {
    this.form = this.fb.group({
      novaQuantidade: [null, [Validators.required, Validators.min(0)]],
    });
  }

  confirmar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.salvando = true;
    this.erro = '';
    this.service.atualizarEstoque(this.anuncio._id, Number(this.form.value.novaQuantidade)).subscribe({
      next: () => {
        this.salvando = false;
        this.salvo.emit();
        this.fechar.emit();
      },
      error: () => {
        this.erro = 'Erro ao atualizar estoque.';
        this.salvando = false;
      },
    });
  }
}
