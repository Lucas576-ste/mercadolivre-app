import { Injectable, inject } from '@angular/core';
import { ToastService } from './toast.service';

interface MlCause {
  code: string;
  type: string;
  message: string;
}

const TRADUCOES: Record<string, string> = {
  'item.available_quantity.invalid':
    'Plano gratuito aceita no máximo 1 unidade em estoque.',
  'item.attribute.product_identifier.invalid_format':
    'ISBN/GTIN inválido — deixe o campo de código de barras em branco.',
  'item.attributes.missing_required':
    'Um ou mais campos obrigatórios da categoria estão ausentes.',
  'item.price.invalid':
    'Preço inválido para esta categoria.',
  'item.title.invalid':
    'Título inválido — evite caracteres especiais como aspas e símbolos.',
  'item.condition.invalid':
    'Condição do produto inválida para esta categoria.',
  'item.listing_type.invalid':
    'Tipo de anúncio inválido para esta categoria.',
  'item.category.invalid':
    'Categoria inválida ou não permitida.',
  'shipping.lost_me1_by_user':
    null, // aviso interno do ML, não mostrar ao usuário
};

@Injectable({ providedIn: 'root' })
export class MlErrorService {
  private toast = inject(ToastService);

  mostrarErros(err: any): void {
    const causes: MlCause[] = err?.error?.detalhe?.cause ?? [];
    const erros = causes.filter(c => c.type === 'error');

    if (erros.length === 0) {
      this.toast.erro(err?.error?.erro ?? 'Ocorreu um erro. Tente novamente.');
      return;
    }

    for (const causa of erros) {
      const traducao = TRADUCOES[causa.code];
      if (traducao === null) continue; // ignorar silenciosamente
      const mensagem = traducao ?? this.extrairMensagemML(causa.message);
      this.toast.erro(mensagem);
    }
  }

  private extrairMensagemML(message: string): string {
    // Mensagens em português do ML são usadas diretamente
    if (/[áéíóúãõâêîôûç]/i.test(message)) return message;
    // Inglês: mensagem genérica
    return 'Erro de validação no Mercado Livre. Verifique os dados e tente novamente.';
  }
}
