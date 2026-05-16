import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Toast, ToastService, ToastTipo } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss',
})
export class ToastComponent {
  private service = inject(ToastService);
  toasts$ = this.service.toasts$;

  remover(id: number): void {
    this.service.remover(id);
  }

  trackById(_: number, toast: Toast): number {
    return toast.id;
  }

  icone(tipo: ToastTipo): string {
    const map: Record<ToastTipo, string> = {
      sucesso: '✓',
      erro: '✕',
      aviso: '!',
    };
    return map[tipo];
  }
}
