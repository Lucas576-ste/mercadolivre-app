# POC — Integração Mercado Livre

Scripts de teste para validar a integração com a API do ML antes de implementar no projeto principal.

## Setup

```bash
cd poc-ml
npm install
```

## Scripts disponíveis

### 1. Testar token
Verifica se o token salvo no MongoDB é válido e exibe dados do usuário autenticado.
```bash
npm run token
```

### 2. Testar preditor de categorias
Testa o preditor de categorias do ML com 3 títulos de exemplo. Não requer autenticação.
```bash
npm run categoria
```

### 3. Listar anúncios
Lista todos os anúncios da conta com id, título, preço, estoque e status.
```bash
npm run listar
```

### 4. Criar anúncio de teste
Cria um anúncio de teste (listing_type_id: "free") e o pausa automaticamente logo após.
```bash
npm run criar
```

> ⚠️ O anúncio criado usa `listing_type_id: "free"` para não gerar custos e é pausado automaticamente após a criação.

## Ordem recomendada de execução

```
npm run token      ← confirme que o token é válido
npm run categoria  ← valide os IDs de categoria
npm run listar     ← veja os anúncios existentes
npm run criar      ← teste a criação (só após validar os passos acima)
```
