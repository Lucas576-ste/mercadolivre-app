# FLUXO DO USUÁRIO — ML Gestor

---

## 1. Visão Geral do Sistema

O **ML Gestor** é uma aplicação web para vendedores do Mercado Livre gerenciarem seus anúncios de forma centralizada. Através de integração com a API oficial do ML via OAuth 2.0, o usuário pode visualizar, criar, editar, sincronizar e atualizar preços e estoques dos seus anúncios sem precisar acessar o painel do Mercado Livre. O backend (Node.js + MongoDB) armazena os tokens de acesso e serve como intermediário entre o frontend Angular e a API do ML.

---

## 2. Arquitetura do Fluxo

```mermaid
flowchart TD
    A([Acessa a aplicação]) --> B{Autenticado?}
    B -- Não --> C[/login]
    B -- Sim --> D[/anuncios]

    C --> E[Clica: Entrar com Mercado Livre]
    E --> F[Redireciona para OAuth do ML]
    F --> G[Usuário autoriza no ML]
    G --> H[ML redireciona para /auth/callback no backend]
    H --> I[Backend salva token no MongoDB]
    I --> D

    D --> J[Visualiza lista de anúncios]
    J --> K[Filtros: busca / status / categoria]
    J --> L[Paginação]
    J --> M[Sincronizar com ML]
    J --> N[+ Novo Anúncio]
    J --> O[Ícone lápis: editar]
    J --> P[Ícone tag: atualizar preço]
    J --> Q[Ícone caixa: atualizar estoque]

    N --> R[/anuncios/novo]
    O --> S[/anuncios/:id/editar]
    P --> T[Modal Preço]
    Q --> U[Modal Estoque]

    R -- Salvar --> D
    S -- Salvar --> D
    T -- Confirmar --> D
    U -- Confirmar --> D
```

---

## 3. Fluxo Detalhado

### 3.1 Primeiro Acesso — Tela de Login
**URL:** `/login`
**Status:** ✅ Implementado

1. O usuário acessa qualquer URL da aplicação.
2. O `AuthGuard` verifica se existe `ml_token` no `localStorage`.
3. Se não existir, redireciona automaticamente para `/login`.
4. Na tela de login, o usuário vê o card com o botão amarelo **"Entrar com Mercado Livre"**.
5. Ao clicar, é redirecionado para `GET /auth/login` no backend.
6. O backend monta a URL de autorização OAuth do ML e redireciona o browser.
7. O usuário vê a tela de autorização do Mercado Livre e concede acesso.
8. O ML redireciona para `GET /auth/callback?code=XXX` no backend.
9. O backend troca o `code` por `access_token` + `refresh_token` e salva no MongoDB.
10. O backend redireciona o browser para `FRONTEND_URL/anuncios`.
11. ⚠️ **Pendente:** o frontend ainda precisa capturar o token nesse redirect e salvar no `localStorage` para o `AuthGuard` reconhecer a sessão.

**Proteção de rotas:**
- Qualquer rota além de `/login` é protegida pelo `AuthGuard`.
- Tentativa de acesso sem `ml_token` no `localStorage` → redirecionado para `/login` imediatamente.

---

### 3.2 Tela de Listagem — Meus Anúncios
**URL:** `/anuncios`
**Status:** ✅ Implementado

1. Ao entrar na rota, o componente chama `GET /anuncios?pagina=1&limite=5`.
2. Enquanto aguarda a resposta, exibe **5 linhas skeleton** com animação pulse.
3. Se não houver anúncios, exibe o **empty state** (ícone de caixa + "Nenhum anúncio encontrado").
4. Se houver anúncios, exibe a tabela com colunas: Título, Categoria, Preço, Estoque, Status e Ações.

**Busca por título:**
- O usuário digita no campo de busca.
- Há um debounce de **400ms** — a requisição só é feita após o usuário parar de digitar.
- A lista recarrega com o parâmetro `busca=termo` na query.

**Filtro de status:**
- Select com opções: Todos / Ativo / Pausado / Fechado.
- Ao mudar a seleção, a lista recarrega imediatamente com o parâmetro `status=valor`.

**Filtro de categoria:**
- Select com as categorias disponíveis.
- Ao mudar, recarrega com o parâmetro `categoria=valor`.

**Paginação:**
- 5 itens por página.
- Rodapé mostra "Mostrando X até Y de Z resultados".
- Botões ‹ e › para navegar; números de página clicáveis; página ativa em amarelo.
- A página atual é destacada visualmente.

**Sincronizar com ML:**
- Ao clicar, chama `POST /anuncios/sincronizar`.
- O ícone gira (fa-spin) e o texto muda para "Sincronizando..." durante a chamada.
- Sucesso: exibe alerta com quantos anúncios foram sincronizados e recarrega a lista.
- Erro: exibe alerta de erro.

**+ Novo Anúncio:**
- Navega para `/anuncios/novo`.

**Ícone lápis (✏️ editar):**
- Navega para `/anuncios/:id/editar` com o ID do anúncio da linha.

**Ícone tag (🏷️ atualizar preço):**
- Abre o `ModalPrecoComponent` passando o anúncio da linha.
- Apenas um modal é exibido por vez.

**Ícone caixa (📦 atualizar estoque):**
- Abre o `ModalEstoqueComponent` passando o anúncio da linha.

**Sair:**
- Clique no avatar + "Sair" na navbar.
- Chama `AuthService.logout()`: remove o `ml_token` do `localStorage` e redireciona para `/login`.

---

### 3.3 Modal Atualizar Preço
**Acionado por:** ícone de tag na listagem
**Status:** ✅ Implementado

1. O overlay escuro cobre a tela; o card branco aparece centralizado.
2. O usuário vê o título **"Atualizar Preço"** com a linha amarela decorativa.
3. Campo **"Preço atual"** (read-only) exibe o valor do anúncio formatado em R$, ex: `R$ 299,90`.
4. Campo **"Novo preço"** com prefixo `R$` — o usuário digita o novo valor.
5. Ao clicar em **Confirmar**:
   - Valida se o valor é maior que R$ 0,01.
   - Chama `PATCH /anuncios/:id/preco` com `{ preco: novoValor }`.
   - Botão fica desabilitado com texto "Salvando..." durante a chamada.
   - ✅ Sucesso: modal fecha e a lista recarrega com o preço atualizado.
   - ❌ Erro: exibe mensagem "Erro ao atualizar preço." abaixo dos botões.
6. Ao clicar em **Cancelar**: modal fecha sem fazer nenhuma requisição.

---

### 3.4 Modal Atualizar Estoque
**Acionado por:** ícone de caixa na listagem
**Status:** ✅ Implementado

1. Mesmo comportamento visual do Modal de Preço.
2. Título: **"Atualizar Estoque"**.
3. Campo **"Estoque atual"** (read-only) exibe, ex: `10 unidades`.
4. Campo **"Nova quantidade"** — input numérico simples, mínimo 0.
5. Ao clicar em **Confirmar**:
   - Valida se o valor é ≥ 0.
   - Chama `PATCH /anuncios/:id/estoque` com `{ estoque: novaQuantidade }`.
   - ✅ Sucesso: modal fecha e a lista recarrega.
   - ❌ Erro: exibe mensagem "Erro ao atualizar estoque."
6. **Cancelar**: fecha o modal sem requisição.

---

### 3.5 Tela Criar Anúncio
**URL:** `/anuncios/novo`
**Status:** ✅ Implementado

**Como chegar:** botão "+ Novo Anúncio" na navbar ou na barra de ações da listagem.

**Campos disponíveis:**

| Campo | Tipo | Obrigatório | Validação |
|---|---|---|---|
| Título | Texto | ✅ | Obrigatório |
| Descrição | Textarea | ❌ | — |
| Categoria | Select | ✅ | Obrigatório |
| Condição | Radio | ✅ | Novo / Usado |
| Preço | Número | ✅ | Mínimo R$ 0,01 |
| Estoque | Número | ✅ | Mínimo 0 |
| URLs das fotos | Texto dinâmico | ❌ | — |

**Campo de fotos:**
- Começa com 3 inputs de URL.
- Clique em "+ Adicionar mais" acrescenta um novo input.
- URLs em branco são ignoradas ao salvar.

**Ao clicar em Salvar:**
1. Valida todos os campos obrigatórios; exibe erros inline nos campos inválidos.
2. Chama `POST /anuncios` com os dados do formulário.
3. Botão fica desabilitado com "Salvando..." durante a chamada.
4. ✅ Sucesso: redireciona para `/anuncios`.
5. ❌ Erro: exibe mensagem de erro abaixo do botão Salvar.

**Cancelar:** navega de volta para `/anuncios` sem salvar.

---

### 3.6 Tela Editar Anúncio
**URL:** `/anuncios/:id/editar`
**Status:** ✅ Implementado

**Como chegar:** clique no ícone de lápis na linha do anúncio na listagem.

1. O componente detecta o parâmetro `:id` na rota.
2. Exibe skeleton de carregamento enquanto busca os dados.
3. Chama `GET /anuncios/:id` para carregar o anúncio.
4. Preenche todos os campos do formulário com os dados existentes.
5. O título da página muda para **"Editar Anúncio"**.
6. Ao clicar em **Salvar**:
   - Chama `PUT /anuncios/:id` com os dados atualizados.
   - ✅ Sucesso: redireciona para `/anuncios`.
   - ❌ Erro: exibe mensagem inline abaixo do botão.
7. **Cancelar:** volta para `/anuncios`.

---

## 4. Rotas da Aplicação

| Rota | Componente | Protegida | Descrição |
|---|---|---|---|
| `/login` | `LoginComponent` | ❌ | Tela de autenticação OAuth |
| `/anuncios` | `ListagemComponent` | ✅ | Lista todos os anúncios |
| `/anuncios/novo` | `FormAnuncioComponent` | ✅ | Formulário de criação |
| `/anuncios/:id/editar` | `FormAnuncioComponent` | ✅ | Formulário de edição |
| `/` | — | — | Redireciona para `/login` |
| `/**` | — | — | Redireciona para `/login` |

---

## 5. Endpoints do Backend Utilizados

| Método | Rota | Usado em | Descrição |
|---|---|---|---|
| `GET` | `/auth/login` | Login | Inicia o fluxo OAuth com o ML |
| `GET` | `/auth/callback` | Login (retorno ML) | Recebe o code, salva token, redireciona |
| `GET` | `/anuncios` | Listagem | Lista anúncios com filtros e paginação |
| `GET` | `/anuncios/:id` | Edição | Busca um anúncio pelo ID |
| `POST` | `/anuncios` | Criar anúncio | Cria anúncio no ML e no banco |
| `PUT` | `/anuncios/:id` | Editar anúncio | Atualiza dados no ML e no banco |
| `PATCH` | `/anuncios/:id/preco` | Modal Preço | Atualiza só o preço |
| `PATCH` | `/anuncios/:id/estoque` | Modal Estoque | Atualiza só o estoque |
| `POST` | `/anuncios/sincronizar` | Listagem | Importa anúncios existentes do ML |

---

## 6. Estados da Aplicação

| Status | Badge | Significado para o usuário |
|---|---|---|
| `active` | 🟢 Ativo | Anúncio visível e disponível para compra no ML |
| `paused` | ⚪ Pausado | Anúncio temporariamente oculto no ML, pode ser reativado |
| `closed` | 🔴 Fechado | Anúncio encerrado, não aparece mais para compradores |

Os badges são exibidos com cores na tabela da listagem: verde para ativo, cinza para pausado e vermelho para fechado.

---

## 7. O que está funcionando ✅

- ✅ Tela de Login com botão de OAuth para o Mercado Livre
- ✅ AuthGuard protegendo todas as rotas exceto `/login`
- ✅ AuthService com `isAuthenticated()`, `saveToken()`, `getToken()` e `logout()`
- ✅ NavbarComponent reutilizável com botão de logout
- ✅ Tela de Listagem com tabela, filtros, paginação e skeleton
- ✅ Busca por título com debounce de 400ms
- ✅ Filtro por status e categoria
- ✅ Paginação com 5 itens por página
- ✅ Empty state quando não há resultados
- ✅ Botão Sincronizar com ML (com loading state)
- ✅ Ícones de ação por linha (editar, preço, estoque)
- ✅ Modal Atualizar Preço (exibe preço atual, campo novo preço, loading, erro)
- ✅ Modal Atualizar Estoque (exibe estoque atual, campo nova quantidade, loading, erro)
- ✅ Formulário de Criação de anúncio com validações
- ✅ Formulário de Edição com carregamento dos dados existentes
- ✅ Campo de fotos dinâmico com "+ Adicionar mais"
- ✅ AnuncioService com todos os métodos HTTP necessários
- ✅ Tailwind CSS configurado com fonte Inter
- ✅ FontAwesome via CDN para ícones
- ✅ Lazy loading de todos os componentes de página

---

## 8. O que ainda precisa ser testado ⚠️

- ⚠️ **Fluxo OAuth real** — o redirect do backend para o frontend após login não salva o token no `localStorage` automaticamente (falta a rota `/auth/callback` no frontend)
- ⚠️ **Criação de anúncio real** na API do ML — depende de credenciais válidas e categoria correta do ML
- ⚠️ **Sincronização** com anúncios existentes na conta do ML
- ⚠️ **Atualização de preço** refletindo em tempo real no painel do ML
- ⚠️ **Atualização de estoque** refletindo no ML
- ⚠️ **Refresh automático do token** quando o `access_token` expirar (6 horas)
- ⚠️ **CORS** entre frontend e backend em produção (Vercel + Render)

---

## 9. Possíveis Erros e Como Tratar

| Erro | Causa | Tratamento |
|---|---|---|
| Token expirado / inválido | `access_token` do ML venceu | Backend renova automaticamente via `refresh_token`; se falhar, redirecionar para `/login` |
| `401 Unauthorized` do backend | Nenhum token salvo no MongoDB | Frontend redireciona para `/login` |
| Erro de conexão com backend | Backend offline ou URL errada | Exibir mensagem genérica "Erro de conexão. Tente novamente." |
| Erro na API do ML | Dados inválidos ou limite de requisições | Exibir mensagem específica retornada pelo backend (`error.response.data`) |
| Anúncio não encontrado | ID inválido ou anúncio deletado | Redirecionar para `/anuncios` com mensagem de aviso |
| Formulário inválido | Campos obrigatórios em branco | Exibir erros inline abaixo de cada campo |

---

## 10. Checklist de Testes Manuais

Execute estes testes antes de considerar o projeto pronto para entrega:

### Autenticação
- [ ] Login com conta real do Mercado Livre (fluxo OAuth completo)
- [ ] Verificar que o token é salvo após o callback
- [ ] Tentar acessar `/anuncios` sem estar logado → deve redirecionar para `/login`
- [ ] Logout → deve limpar o `localStorage` e redirecionar para `/login`

### Listagem
- [ ] Visualizar lista de anúncios (requer backend + MongoDB rodando)
- [ ] Buscar anúncio por título (verificar debounce de 400ms)
- [ ] Filtrar por status: Ativo, Pausado, Fechado
- [ ] Filtrar por categoria
- [ ] Paginar resultados (navegar entre páginas)
- [ ] Verificar skeleton durante o carregamento
- [ ] Verificar empty state quando não há resultados

### Sincronização
- [ ] Sincronizar com ML → anúncios da conta aparecem na listagem
- [ ] Verificar loading state do botão durante sincronização

### Criar Anúncio
- [ ] Criar novo anúncio com todos os campos obrigatórios
- [ ] Tentar salvar sem preencher campos obrigatórios → erros aparecem
- [ ] Adicionar múltiplas URLs de fotos com "+ Adicionar mais"
- [ ] Verificar que o anúncio aparece no Mercado Livre após criação
- [ ] Verificar redirecionamento para `/anuncios` após sucesso

### Editar Anúncio
- [ ] Clicar no lápis → formulário carrega com dados do anúncio
- [ ] Alterar campos e salvar → verificar atualização no ML
- [ ] Cancelar → voltar para listagem sem alterações

### Modais
- [ ] Atualizar preço → verificar reflexo no ML
- [ ] Atualizar estoque → verificar reflexo no ML
- [ ] Cancelar modal → lista não é afetada
- [ ] Verificar que apenas um modal abre por vez

### Geral
- [ ] Verificar responsividade em mobile
- [ ] Verificar que mudanças de preço e estoque refletem no Mercado Livre
- [ ] Testar com token expirado (após 6 horas)
