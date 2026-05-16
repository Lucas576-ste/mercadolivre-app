import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastTipo = 'sucesso' | 'erro' | 'aviso';

export interface Toast {
  id: number;
  tipo: ToastTipo;
  mensagem: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private counter = 0;
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  toasts$ = this.toastsSubject.asObservable();

  private show(tipo: ToastTipo, mensagem: string, duracao = 4000): void {
    const id = ++this.counter;
    const toast: Toast = { id, tipo, mensagem };
    this.toastsSubject.next([...this.toastsSubject.value, toast]);
    setTimeout(() => this.remover(id), duracao);
  }

  sucesso(mensagem: string): void { this.show('sucesso', mensagem); }
  erro(mensagem: string): void    { this.show('erro', mensagem, 6000); }
  aviso(mensagem: string): void   { this.show('aviso', mensagem); }

  remover(id: number): void {
    this.toastsSubject.next(this.toastsSubject.value.filter(t => t.id !== id));
  }
}
