# Gestor de Anúncios — Mercado Livre

Aplicação web fullstack para gerenciar anúncios no Mercado Livre. Permite criar, editar, pausar, sincronizar e excluir anúncios diretamente pela interface, com integração via OAuth 2.0 com a API oficial do ML.

**Demo em produção:**
- Frontend: https://mercadolivre-app.vercel.app
- Backend: https://ml-gestor.onrender.com

---

## Funcionalidades

- Autenticação OAuth 2.0 com o Mercado Livre (refresh token automático)
- Criação de anúncios com detecção automática de categoria via `domain_discovery`
- Upload de fotos por arquivo local (enviadas ao CDN do ML)
- Edição de título, preço, estoque, condição, descrição e fotos
- Atualização rápida de preço e estoque via modais inline na listagem
- Alteração de status (ativo / pausado)
- Sincronização dos anúncios existentes no ML com o banco local
- Exclusão com fechamento automático no ML
- Filtros por status e categoria + busca por texto
- Paginação
- Toasts com mensagens de erro detalhadas da API do ML
- Suporte a status `under_review` (anúncios em análise)

---

## Tecnologias

| Camada    | Stack                                      |
|-----------|--------------------------------------------|
| Backend   | Node.js 20, Express, Mongoose (MongoDB)    |
| Frontend  | Angular 17, Tailwind CSS, Font Awesome     |
| Banco     | MongoDB Atlas                              |
| Deploy    | Render (backend) + Vercel (frontend)       |

---

## Pré-requisitos

- Node.js 20+
- npm 10+
- Conta no [MongoDB Atlas](https://www.mongodb.com/atlas) (ou MongoDB local)
- Aplicativo criado no [Mercado Livre Developers](https://developers.mercadolivre.com.br)

---

## Configuração local

### 1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd mercadolivre-app
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:

```env
PORT=3000
NODE_ENV=development

# MongoDB Atlas
MONGO_URI=mongodb+srv://<usuario>:<senha>@cluster0.xxxxx.mongodb.net/mercadolivre-app

# Mercado Livre OAuth 2.0
ML_CLIENT_ID=seu_client_id_aqui
ML_CLIENT_SECRET=seu_client_secret_aqui
ML_REDIRECT_URI=http://localhost:3000/auth/callback

# URL do frontend (usada no redirect após login)
FRONTEND_URL=http://localhost:4200
```

Inicie o servidor:

```bash
npm run dev      # desenvolvimento (nodemon)
npm start        # produção
```

O backend sobe em `http://localhost:3000`.

### 3. Frontend

```bash
cd frontend
npm install
```

O arquivo `src/environments/environment.ts` já aponta para `http://localhost:3000` por padrão. Nenhuma alteração necessária para rodar localmente.

```bash
npm start        # ng serve — disponível em http://localhost:4200
```

---

## Variáveis de ambiente

### Backend (`backend/.env`)

| Variável          | Descrição                                                  |
|-------------------|------------------------------------------------------------|
| `PORT`            | Porta do servidor Express (padrão: 3000)                   |
| `NODE_ENV`        | `development` ou `production`                              |
| `MONGO_URI`       | String de conexão do MongoDB Atlas                         |
| `ML_CLIENT_ID`    | Client ID do app no Mercado Livre Developers               |
| `ML_CLIENT_SECRET`| Client Secret do app no Mercado Livre Developers           |
| `ML_REDIRECT_URI` | URI de callback OAuth (deve coincidir com o cadastrado no ML) |
| `FRONTEND_URL`    | URL do frontend (para redirect após autenticação)          |

### Frontend (`src/environments/`)

| Arquivo                  | `apiUrl`                         |
|--------------------------|----------------------------------|
| `environment.ts`         | `http://localhost:3000`          |
| `environment.prod.ts`    | `https://ml-gestor.onrender.com` |

---

## Configurando o app no Mercado Livre

1. Acesse [developers.mercadolivre.com.br](https://developers.mercadolivre.com.br) e crie um novo aplicativo.
2. Em **URLs de redirecionamento**, adicione:
   - Local: `http://localhost:3000/auth/callback`
   - Produção: `https://ml-gestor.onrender.com/auth/callback`
3. Copie o **Client ID** e **Client Secret** para o `.env`.
4. No app, acesse `http://localhost:4200` e clique em **Conectar Mercado Livre** para autorizar.

---

## Estrutura do projeto

```
mercadolivre-app/
├── backend/
│   ├── server.js                  # Entry point Express
│   └── src/
│       ├── controller/            # Controllers HTTP
│       ├── domain/
│       │   ├── entity/Anuncio.js  # Schema Mongoose
│       │   └── exception/         # Exceções tipadas
│       ├── repository/            # Acesso ao MongoDB
│       ├── routes/                # Rotas Express
│       └── service/
│           ├── anuncio.service.js # Lógica de negócio
│           └── mlApi.service.js   # Client da API do ML
└── frontend/
    └── src/app/
        ├── components/            # Modais e navbar
        ├── pages/
        │   ├── listagem/          # Página principal com filtros
        │   ├── form-anuncio/      # Criação e edição
        │   └── auth-callback/     # Callback OAuth
        └── services/              # HTTP services + MlErrorService
```

---

## API — endpoints principais

| Método | Rota                         | Descrição                            |
|--------|------------------------------|--------------------------------------|
| GET    | `/auth/login`                | Redireciona para autorização ML      |
| GET    | `/auth/callback`             | Callback OAuth                       |
| GET    | `/anuncios`                  | Lista anúncios (filtros + paginação) |
| POST   | `/anuncios`                  | Cria anúncio no ML e no banco        |
| PUT    | `/anuncios/:id`              | Edita anúncio                        |
| DELETE | `/anuncios/:id`              | Exclui (fecha no ML)                 |
| PATCH  | `/anuncios/:id/preco`        | Atualiza preço                       |
| PATCH  | `/anuncios/:id/estoque`      | Atualiza estoque                     |
| PATCH  | `/anuncios/:id/status`       | Ativa ou pausa                       |
| POST   | `/anuncios/sincronizar`      | Sincroniza do ML para o banco        |
| GET    | `/anuncios/categorias`       | Categorias distintas no banco        |
| POST   | `/upload`                    | Upload de foto (retorna URL local)   |

---

## Deploy em produção

### Backend (Render)

1. Crie um Web Service apontando para a pasta `backend/`.
2. Build command: `npm install`
3. Start command: `npm start`
4. Adicione todas as variáveis de ambiente da seção acima nas configurações do Render.

### Frontend (Vercel)

1. Crie um projeto apontando para a pasta `frontend/`.
2. Framework: Angular
3. Build command: `npm run build`
4. Output directory: `dist/frontend/browser`
5. Nenhuma variável de ambiente adicional necessária — a URL da API em produção já está em `environment.prod.ts`.

---

## Observações sobre o Mercado Livre

- **Anúncios de contas novas** entram em status `under_review` — isso é uma política do ML, não um bug. O app exibe badge "Em análise" e bloqueia alterações enquanto o ML faz a revisão.
- **Listagens gratuitas (`free`)** têm estoque limitado a 1 unidade pela API do ML.
- A sincronização ignora anúncios com status `closed` para evitar que itens excluídos localmente reapareçam.
