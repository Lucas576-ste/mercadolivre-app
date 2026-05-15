# ENTREVISTA TÉCNICA — ML Gestor

---

## Seção 1 — Visão Geral do Projeto

O ML Gestor é uma aplicação web para vendedores do Mercado Livre gerenciarem seus anúncios de forma centralizada. O backend foi feito em Node.js com Express e MongoDB, integrado à API oficial do ML via OAuth 2.0. O frontend é uma SPA em Angular com Tailwind CSS. O objetivo é permitir visualizar, criar, editar, sincronizar e atualizar preços e estoques sem precisar acessar o painel do ML diretamente.

---

## Seção 2 — Perguntas e Respostas

---

## BLOCO 1 — Sobre o Projeto em Geral

❓ O que é esse projeto e o que ele faz?

💬 É um painel de gestão de anúncios do Mercado Livre. O vendedor faz login com a conta do ML, e o sistema puxa todos os anúncios dele para poder editar, atualizar preço e estoque, criar novos e sincronizar com o que já existe na plataforma — tudo em um lugar só, sem precisar ficar abrindo o site do ML.

---

❓ Por que você escolheu essa stack?

💬 Node.js com Express porque é leve, rápido de escrever e tem ótima integração com APIs externas. MongoDB porque os dados dos anúncios variam bastante de estrutura e o schema flexível ajuda. Angular porque a vaga pedia Angular e quis colocar em prática. Tailwind para agilizar o CSS sem precisar de uma biblioteca de componentes.

---

❓ Como você dividiria o projeto em camadas?

💬 No backend segui MVC: Models definem a estrutura dos dados no MongoDB, Controllers têm a lógica de cada operação, e Routes expõem os endpoints. No frontend separei em pages (telas), components (partes reutilizáveis), services (chamadas HTTP) e guards (controle de acesso). Cada camada tem uma responsabilidade clara.

---

❓ O que é um monorepo e por que você usou?

💬 Monorepo é ter o backend e o frontend no mesmo repositório Git, em vez de dois repositórios separados. Usei porque o projeto tem só dois lados que trabalham juntos, então fica mais fácil de versionar, compartilhar contexto e apresentar para o recrutador em um link só no GitHub.

---

## BLOCO 2 — Sobre o Backend (Node.js + Express + MongoDB)

❓ Como funciona a autenticação OAuth com o Mercado Livre?

💬 O usuário clica em "Entrar com ML", o backend redireciona para a página de autorização do ML. O usuário autoriza, o ML manda um código temporário para o nosso callback. O backend troca esse código por um access token e um refresh token, salva no banco e redireciona o usuário para o frontend já autenticado.

---

❓ O que é OAuth 2.0 e por que ele é usado aqui?

💬 OAuth 2.0 é um protocolo que permite que uma aplicação acesse recursos de outra em nome do usuário, sem que o usuário precise compartilhar sua senha. Usamos aqui porque o ML exige isso para liberar acesso à API de anúncios. É o padrão de mercado para integrações seguras entre sistemas.

---

❓ Por que você salvou o token no banco em vez do localStorage?

💬 O backend roda no Render, que reinicia o servidor periodicamente. Se o token ficasse só em memória, o usuário perderia a sessão a cada reinício. Salvar no MongoDB garante que o token persiste independente de reinicializações. O localStorage seria opção para o frontend, mas o token da API do ML fica melhor protegido no servidor.

---

❓ O que é refresh token e como você implementou a renovação automática?

💬 O access token do ML expira em 6 horas. O refresh token serve para pedir um novo access token sem que o usuário precise logar de novo. Implementei uma função `getValidToken()` que, antes de cada requisição, verifica se o token está expirado e, se estiver, chama automaticamente o endpoint do ML para renovar e salva o novo token no banco.

---

❓ O que é exponential backoff e por que você usou nos retries?

💬 É uma estratégia onde, quando uma requisição falha, você espera antes de tentar de novo — e a cada nova falha, dobra o tempo de espera. Usei com o `axios-retry` porque APIs externas como a do ML podem ter instabilidades momentâneas. Com 3 tentativas e espera crescente, evito sobrecarregar a API e aumento a chance de sucesso sem bloquear o usuário.

---

❓ Como você evitou dados duplicados no MongoDB?

💬 O campo `ml_id` no model de Anúncio tem índice único e `sparse: true`. Isso impede que dois documentos tenham o mesmo ID do ML. Além disso, na sincronização uso `findOneAndUpdate` com `upsert: true`, que atualiza se já existe ou cria se não existe — nunca duplica.

---

❓ O que é upsert e quando você usou?

💬 Upsert é uma operação que tenta atualizar um registro e, se não encontrar, cria um novo. Usei na sincronização de anúncios: quando o ML retorna 100 anúncios, não sei quais já existem no banco. Com upsert, faço uma só operação por anúncio que resolve os dois casos sem precisar verificar antes.

---

❓ Como você estruturou as rotas do backend?

💬 Segui o padrão MVC. Cada recurso tem um arquivo de rotas que define os endpoints, um controller com a lógica de cada ação, e um model com o schema do MongoDB. As rotas de anúncio passam pelo middleware de autenticação antes de chegar no controller, garantindo que só usuários autenticados acessam.

---

❓ O que faz o middleware de autenticação?

💬 Antes de qualquer rota de anúncio ser executada, esse middleware verifica se existe um token salvo no banco. Se não existir, retorna 401. Se existir, chama `getValidToken()` para garantir que o token está válido e renovado. Só depois disso a requisição segue para o controller.

---

❓ O que é o axios-retry e para que serve aqui?

💬 É uma biblioteca que adiciona lógica de retry automático ao axios. Configurei para tentar até 3 vezes em caso de erro de rede ou respostas 5xx da API do ML, com espera exponencial entre as tentativas. Isso torna a integração mais robusta sem precisar escrever essa lógica manualmente.

---

## BLOCO 3 — Sobre o Frontend (Angular)

❓ Por que Angular e não React ou Vue?

💬 A vaga pedia Angular, então foi uma decisão intencional para demonstrar capacidade com a tecnologia exigida. Angular também traz estrutura mais opinativa — roteamento, injeção de dependência e formulários já vêm embutidos — o que acelera o desenvolvimento de aplicações corporativas como essa.

---

❓ O que é um componente standalone no Angular?

💬 É um componente que não precisa ser declarado em um NgModule. Ele importa diretamente o que precisa no próprio decorador. É o padrão do Angular 17 em diante, deixa o código mais simples e o lazy loading mais fácil de configurar por rota.

---

❓ O que é o AuthGuard e para que serve?

💬 É uma função que o Angular executa antes de carregar uma rota protegida. No projeto, ele verifica se existe `ml_token` no `localStorage`. Se não existir, cancela a navegação e redireciona para `/login`. Assim nenhuma tela protegida carrega sem o usuário estar autenticado.

---

❓ O que é um interceptor HTTP e o que ele faz no projeto?

💬 É uma função que intercepta todas as requisições HTTP antes de enviá-las. No projeto, o interceptor captura respostas com status 401 e redireciona o usuário para `/login` automaticamente. É o lugar certo para tratar autenticação de forma global sem repetir código em cada service.

---

❓ Como você gerenciou o estado dos filtros na listagem?

💬 Usei propriedades simples no componente: `termoBusca`, `statusFiltro`, `categoriaFiltro` e `paginaAtual`. Quando algum muda, chama o método `carregar()` que monta os query params e faz uma nova requisição. Não precisei de Redux ou NgRx porque o estado é local a essa tela.

---

❓ O que é ReactiveFormsModule e por que usou no formulário?

💬 É o módulo do Angular para formulários orientados a código — você define a estrutura do formulário no TypeScript com `FormBuilder`, e o HTML só se conecta via `formControlName`. Escolhi porque dá mais controle: validações, valores e estado do formulário ficam todos no componente, mais fácil de testar e manipular.

---

❓ O que é FormArray e onde você usou?

💬 FormArray é uma lista de controles de formulário que pode crescer dinamicamente. Usei no campo de fotos do formulário de anúncio: começa com 3 inputs de URL, e cada clique em "+ Adicionar mais" empurra um novo `FormControl` para o array. O tamanho da lista é controlado pelo usuário.

---

❓ Como funciona o debounce na busca?

💬 Criei um `Subject` do RxJS que recebe cada tecla digitada. Com o operador `debounceTime(400)`, ele espera 400ms sem novas teclas antes de emitir o valor. Só aí a requisição é feita. Sem isso, cada letra digitada dispararia uma chamada HTTP, o que sobrecarregaria o backend.

---

❓ Como os modais se comunicam com a listagem?

💬 A listagem passa o anúncio selecionado via `@Input()` para o modal. O modal emite eventos via `@Output()`: `fechar` quando o usuário cancela e `salvo` quando a atualização tem sucesso. A listagem ouve esses eventos, fecha o modal e recarrega a lista quando necessário.

---

❓ O que é two-way binding e onde aparece no projeto?

💬 É a sincronização automática entre o valor de uma variável no TypeScript e o que aparece no HTML. No projeto aparece nos filtros da listagem com `[(ngModel)]` — quando o usuário muda o select de status, a variável `statusFiltro` atualiza automaticamente, e vice-versa.

---

## BLOCO 4 — Sobre Angular especificamente

❓ Qual a diferença entre Observable e Promise?

💬 Promise resolve uma vez e acabou. Observable é um fluxo que pode emitir múltiplos valores ao longo do tempo, pode ser cancelado e tem operadores poderosos como `debounceTime` e `map`. O `HttpClient` do Angular retorna Observables, o que permite cancelar requisições em andamento se o componente for destruído.

---

❓ O que é o HttpClient do Angular?

💬 É o serviço do Angular para fazer requisições HTTP. Retorna Observables, já integra com os interceptors e tem suporte a tipagem com TypeScript. Usei nos services para fazer todas as chamadas ao backend — GET, POST, PUT e PATCH.

---

❓ O que é injeção de dependência no Angular?

💬 É quando um componente ou service declara o que precisa e o Angular se encarrega de criar e fornecer. No projeto usei com `inject(AnuncioService)` — não instanciei o service manualmente, o Angular entrega a mesma instância para quem precisar. Facilita testes e evita acoplamento.

---

❓ Qual a diferença entre ngOnInit e constructor?

💬 O constructor é chamado quando a classe é criada pelo Angular e serve para injetar dependências. O `ngOnInit` é chamado depois que os `@Input()` já foram preenchidos, ou seja, é o lugar certo para buscar dados e inicializar o componente. Usei `ngOnInit` para carregar os anúncios e inicializar os formulários.

---

❓ O que são Inputs e Outputs no Angular?

💬 `@Input()` é como um componente filho recebe dados do pai — funciona como um parâmetro. `@Output()` é como o filho avisa o pai que algo aconteceu — usando `EventEmitter`. Nos modais, o anúncio selecionado entra via `@Input()` e os eventos de fechar e salvo saem via `@Output()`.

---

❓ O que é o Router e como você configurou as rotas?

💬 O Router é o módulo do Angular que mapeia URLs para componentes. Configurei em `app.routes.ts` com um array de objetos definindo path, componente e guard. Todas as rotas usam `loadComponent` para lazy loading — o componente só é carregado quando o usuário navega para aquela rota.

---

## BLOCO 5 — Sobre Decisões Técnicas

❓ Por que MongoDB e não um banco relacional como PostgreSQL?

💬 Os anúncios do Mercado Livre têm estruturas variáveis dependendo da categoria — um anúncio de veículos tem campos completamente diferentes de um de eletrônicos. O MongoDB lida bem com esse schema flexível. Para um projeto com dados mais relacionais e consistência crítica, escolheria PostgreSQL.

---

❓ Por que Render para o backend e Vercel para o frontend?

💬 Vercel é especializado em frontends estáticos e SPAs — deploy automático do Angular com zero configuração. Render tem um plano gratuito que roda Node.js com variáveis de ambiente e se conecta ao MongoDB Atlas. As duas plataformas têm integração com GitHub e fazem deploy automático a cada push.

---

❓ Como você lidaria com atualizações concorrentes no estoque?

💬 No projeto atual não há controle de concorrência — duas requisições simultâneas podem sobrescrever uma à outra. Em produção real eu usaria operadores atômicos do MongoDB como `$inc` para incrementar/decrementar o estoque ao invés de setar o valor absoluto, o que garante que cada operação é aplicada corretamente mesmo em paralelo.

---

❓ O que acontece se a API do Mercado Livre cair?

💬 O `axios-retry` tenta até 3 vezes com espera exponencial. Se ainda assim falhar, o backend retorna o erro para o frontend com a mensagem da API do ML. O frontend exibe a mensagem de erro inline ou em alerta. Os dados locais no MongoDB continuam intactos — só a sincronização com o ML fica pendente.

---

❓ Como você garantiu que os dados locais ficam sincronizados com o ML?

💬 Implementei o botão "Sincronizar com ML" que busca todos os anúncios ativos da conta e faz upsert no banco com os dados mais recentes do ML. Isso garante que, mesmo que algo mude direto no painel do ML, o usuário consegue atualizar o banco local com um clique. É uma sincronização manual por ora.

---

## BLOCO 6 — Sobre Boas Práticas

❓ Como você organizou as pastas do projeto?

💬 Backend segue MVC: `models/`, `controllers/`, `routes/`, `services/`, `middlewares/` e `config/`. Frontend segue feature-based: `pages/` para telas completas, `components/` para partes reutilizáveis, `services/` para lógica HTTP e `guards/` para proteção de rotas. Cada pasta tem uma responsabilidade única.

---

❓ Por que você separou services dos components no Angular?

💬 Componente deve só renderizar e reagir a interações. Lógica de negócio e chamadas HTTP ficam no service. Isso facilita reutilizar a mesma chamada em componentes diferentes, testar a lógica isolada e trocar a implementação sem mexer no componente. É separação de responsabilidades aplicada.

---

❓ O que está no arquivo DECISIONS.md e por que você criou?

💬 Registra todas as decisões técnicas do projeto: o que foi escolhido, as alternativas consideradas e o motivo da escolha. Criei para demonstrar que as decisões foram conscientes e não aleatórias, e para ter um documento de referência caso alguém questione por que X foi usado em vez de Y.

---

❓ Como você tratou erros nas chamadas HTTP?

💬 No backend, cada controller tem try/catch que captura erros e retorna status HTTP adequado com uma mensagem descritiva. No frontend, cada `.subscribe()` tem um bloco `error` que exibe a mensagem ao usuário — inline no formulário ou via alert. O interceptor captura 401 globalmente e redireciona para login.

---

❓ O que você faria diferente se tivesse mais tempo?

💬 Implementaria o callback completo do OAuth no frontend para salvar o token automaticamente após o login real. Adicionaria um sistema de toast notifications no lugar dos `alert()`. Criaria testes unitários nos services e nos guards. E configuraria variáveis de ambiente no Vercel e Render para o deploy em produção.

---

## BLOCO 7 — Perguntas Armadilha

❓ Você nunca tinha usado Angular. Como aprendeu durante o projeto?

💬 Fui direto para a documentação oficial e aprendi fazendo. Comecei pelo que precisava: componentes standalone, roteamento, formulários reativos e HttpClient. Não tentei aprender tudo antes — fui resolvendo os problemas na ordem que apareceram. Errei, consertei e entendi o porquê de cada coisa.

---

❓ O que você faria se o token OAuth expirasse durante uma ação do usuário?

💬 O backend já trata isso: antes de cada requisição à API do ML, `getValidToken()` verifica a expiração e renova automaticamente. Se o refresh token também estiver inválido, o backend retorna 401, o frontend detecta pelo interceptor e redireciona para o login. O usuário perde no máximo a ação atual, não a sessão inteira.

---

❓ Se dois usuários atualizassem o estoque ao mesmo tempo, o que aconteceria?

💬 No estado atual, a última requisição a chegar venceria — race condition clássica. Para resolver, usaria operações atômicas do MongoDB com `$inc` ao invés de `$set`, ou implementaria otimistic locking com um campo de versão no documento. É uma limitação conhecida que priorizaria corrigir antes de ir para produção com múltiplos usuários.

---

❓ Seu projeto está em produção. Como você monitoraria erros?

💬 Adicionaria o Sentry para capturar exceções no frontend e no backend automaticamente, com stack trace e contexto. No backend, usaria logs estruturados com Winston enviando para um serviço como Logtail ou Papertrail. Configuraria alertas para erros 5xx e monitoraria o tempo de resposta dos endpoints críticos.

---

❓ O que é CORS e você precisou configurar no projeto?

💬 CORS é uma política do browser que bloqueia requisições para um domínio diferente do que serviu a página. Sim, configurei no backend usando o pacote `cors` do Express — liberando requisições vindas do domínio do frontend. Em desenvolvimento liberei tudo; em produção restringiria apenas ao domínio do Vercel.

---

## Seção 3 — Dicas Rápidas para a Entrevista

**1. Quando não souber responder:**
Diga "Não trabalhei com isso diretamente, mas entendo o conceito como..." e conecte com algo que você sabe. Nunca invente. Honestidade técnica conta mais do que fingir saber.

**2. Demonstre que tomou decisões conscientes:**
Para cada tecnologia, tenha pronto: "Escolhi X porque Y, e a alternativa seria Z." O DECISIONS.md foi feito exatamente para isso — conheça cada entrada dele.

**3. Use o DECISIONS.md a seu favor:**
Mencione que você documentou as decisões durante o projeto. Isso mostra maturidade de processo. Se perguntarem "por que MongoDB?", você pode dizer "essa foi a Decisão 1 do projeto, documentei o raciocínio..."

**4. Mostre que entende o fluxo completo:**
Consiga explicar o caminho completo: usuário clica → frontend chama → backend processa → ML responde → banco atualiza → frontend exibe. Quem entende o fluxo inteiro demonstra visão de sistema.

**5. O que NÃO falar:**
Não diga "copiei da documentação" ou "o Claude fez". Diga "implementei", "decidi", "escolhi". Você tomou as decisões — ferramentas são meios, não autores. Também não minimize o projeto: é uma integração real com OAuth 2.0, não é CRUD básico.

---

## Seção 4 — Glossário Rápido

| Termo | Definição |
|---|---|
| **OAuth 2.0** | Protocolo que permite acessar recursos de um serviço em nome do usuário sem usar senha |
| **Refresh Token** | Token de longa duração usado para obter um novo access token sem pedir login novamente |
| **Upsert** | Operação que atualiza um registro se ele existe ou cria um novo se não existe |
| **Exponential Backoff** | Estratégia de retry onde o tempo de espera entre tentativas dobra a cada falha |
| **Middleware** | Função que executa entre a requisição e o handler final, usada para autenticação, logs etc. |
| **AuthGuard** | Função do Angular que decide se uma rota pode ser acessada antes de carregá-la |
| **Interceptor HTTP** | Função que intercepta todas as requisições/respostas HTTP para aplicar lógica global |
| **Observable** | Fluxo de dados assíncrono do RxJS que pode emitir múltiplos valores e ser cancelado |
| **FormArray** | Lista dinâmica de controles de formulário no Angular que pode crescer em tempo real |
| **Debounce** | Técnica que atrasa a execução de uma função até que o usuário pare de executar o gatilho |
| **Standalone Component** | Componente Angular que não precisa de NgModule e importa suas dependências diretamente |
| **Injeção de Dependência** | Padrão onde o framework fornece as dependências que uma classe precisa ao invés de ela criar |
| **MVC** | Padrão arquitetural que separa a aplicação em Model (dados), View (UI) e Controller (lógica) |
| **Monorepo** | Repositório único que contém múltiplos projetos relacionados (ex: backend + frontend) |
| **CORS** | Política do browser que controla quais domínios externos podem fazer requisições à sua API |
