# ML Gestor — Padrões Arquiteturais

## Arquitetura MVC obrigatória

Este projeto segue separação estrita de camadas. Sempre respeitar as regras abaixo ao criar ou modificar qualquer arquivo.

### Controller
- Recebe a requisição HTTP e extrai parâmetros (presença obrigatória apenas)
- Chama exclusivamente o Service correspondente
- Retorna a resposta HTTP com o dado que o Service devolveu
- **Proibido:** lógica de negócio, `isNaN`, regras de domínio, acesso a Repository ou Entity

### Service
- Contém toda a lógica de negócio e orquestração
- Única camada que conhece regras de domínio (validações de valor, tipo, formato)
- Lança exceptions de domínio (`ValidationException`, `NotFoundException`, etc.)
- **Proibido:** conhecimento de HTTP (`req`, `res`, status codes, headers), acesso direto ao banco sem Repository

### Repository
- Encapsula exclusivamente o acesso ao banco de dados
- Métodos com nomes semânticos
- **Proibido:** regras de negócio, lógica condicional de domínio, chamar outros Repositories

### Entity (`domain/entity/`)
- Mapeamento fiel ao banco
- Métodos utilitários simples e puros (sem efeito colateral)
- **Proibido:** lógica de negócio complexa, dependência de Service ou Repository

### Exceptions (`domain/exception/`)
- Apenas `name` e `message` — sem `httpStatus`
- O mapeamento exception → status HTTP é exclusivo do `errorHandler.js`
- Exceptions disponíveis: `ValidationException` (400), `UnauthorizedException` (401), `NotFoundException` (404), `ConflictException` (409), `MercadoLivreException` (400)

### Middleware
- Não acessa Repository diretamente — delega ao Service
- `errorHandler.js` é o único lugar que mapeia exceptions para status HTTP

## Regras de código

- Sem código duplicado entre funções do mesmo arquivo — extrair helper privado
- Validação de presença (`=== undefined`) fica no Controller
- Validação de valor/tipo (`isNaN`, `> 0`, formato) fica no Service
- Novas exceptions de domínio devem ser registradas no `errorHandler.js`
- `server.js` não importa Entity nem Repository diretamente — usa apenas rotas e middlewares (exceção: bootstrap de migrations via Repository)
