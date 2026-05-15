# DECISIONS — Registro de Decisões Técnicas do Projeto

> Este arquivo registra todas as decisões técnicas tomadas durante o desenvolvimento, com o motivo de cada escolha. Serve como referência para explicar as escolhas ao recrutador.

---

## Decisão 1 — Estrutura de Pastas do Projeto
- **Decisão tomada:** Monorepo (backend e frontend na mesma pasta raiz)
- **Motivo:** Projeto de médio porte com prazo curto. Um único repositório GitHub facilita o versionamento, a apresentação ao recrutador e o gerenciamento geral do projeto.
- **Data:** 2026-05-13

---

## Decisão 2 — Arquitetura Interna do Backend
- **Decisão tomada:** MVC (Models / Controllers / Routes)
- **Motivo:** Padrão amplamente reconhecido no mercado, fácil de explicar em entrevista técnica e adequado ao tamanho do projeto.
- **Data:** 2026-05-13

---

## Decisão 3 — Gerenciador de Pacotes
- **Decisão tomada:** npm
- **Motivo:** Vem instalado com o Node.js, sem configuração extra, universal e suficiente para o projeto.
- **Data:** 2026-05-13

---

## Decisão 4 — Armazenamento do Token OAuth
- **Decisão tomada:** Salvar no MongoDB
- **Motivo:** O Render reinicia o servidor com frequência, o que apagaria um token em memória. Salvar no banco garante que o usuário não precise fazer login toda vez que o servidor reiniciar.
- **Data:** 2026-05-13

---

## Decisão 5 — Renovação do Token OAuth
- **Decisão tomada:** Renovação automática via interceptor (refresh token)
- **Motivo:** O token do ML expira em 6 horas. A renovação automática evita interrupção para o usuário e demonstra maturidade técnica na implementação do OAuth 2.0.
- **Data:** 2026-05-13

---

## Decisão 6 — Estratégia de Retry em Falhas com a API do ML
- **Decisão tomada:** Retry com espera exponencial (exponential backoff), 3 tentativas
- **Motivo:** Padrão da indústria para integrações com APIs externas. A biblioteca axios-retry já estava no package.json e implementa isso com mínimo de código.
- **Data:** 2026-05-13

---

## Decisão 7 — Gerenciamento de Estado no Frontend
- **Decisão tomada:** Services com RxJS (BehaviorSubject) — sem NgRx
- **Motivo:** O projeto não tem estado global complexo que justifique NgRx. Services com BehaviorSubject são suficientes, mais simples de explicar em entrevista e evitam dependência externa extra.
- **Data:** 2026-05-14

---
