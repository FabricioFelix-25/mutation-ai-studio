# Mutation Studio - Estado Atual do Projeto

## 1) Visao Geral
Este projeto e uma interface Angular para acompanhamento de qualidade de testes com foco em mutation testing.

A interface implementa:
- Dashboard com cards flutuantes
- Configuracao de projeto via stepper
- Medidores circulares (gauges) com comparacao Antes vs Depois
- Analise textual com feedback de qualidade
- Visualizador Diff lado a lado com cores pastel

Neste momento, os dados exibidos sao mockados e centralizados em um service local.

## 2) Stack Tecnica
- Angular 21 (standalone components)
- Angular Material (stepper, form fields, botoes, checkbox)
- SCSS
- Lucide Angular (icones)
- Chart.js + ng2-charts instalados (ainda nao utilizados na tela atual)

Dependencias principais no `package.json`:
- `@angular/*` (core, router, forms, material, cdk, animations)
- `lucide-angular`
- `chart.js`
- `ng2-charts`

## 3) Como Rodar Localmente
No PowerShell (como no ambiente atual):

```powershell
cd C:\Users\fgb87\OneDrive\Documentos\Playground\mutation-studio
npm.cmd install
npm.cmd start
```

Abrir no navegador:
- `http://localhost:4200`

Build de producao:

```powershell
npm.cmd run build
```

## 4) Scripts Disponiveis
- `npm run start`: sobe o servidor de desenvolvimento (`ng serve`)
- `npm run build`: gera build de producao (`ng build`)
- `npm run watch`: build em modo watch para desenvolvimento
- `npm run test`: executa testes (`ng test`)

## 5) Estrutura de Pastas (src/app)
```text
src/app
|-- app.config.ts
|-- app.routes.ts
|-- core
|   |-- models
|   |   `-- studio.models.ts
|   `-- services
|       `-- studio-data.service.ts
|-- shared
|   `-- components
|       |-- floating-card
|       |-- progress-gauge
|       `-- status-badge
`-- features
    |-- dashboard
    |   |-- components/metrics-panel
    |   `-- pages/dashboard-page
    |-- project-setup
    |   `-- components/project-setup-stepper
    `-- comparison
        `-- components
            |-- quality-insights
            `-- diff-viewer
```

## 6) Arquitetura Atual
### Core
- `core/models/studio.models.ts`
  - Tipos de dominio da UI (metricas, badges, feedbacks, diff etc.)
- `core/services/studio-data.service.ts`
  - Fonte unica de dados mockados usados por todos os componentes

### Shared
- `floating-card`: card padronizado com cabecalho, icone e conteudo
- `status-badge`: badge com tons (`soft-blue`, `emerald`, `amber`, `muted`)
- `progress-gauge`: gauge circular customizado em SVG

### Features
- `dashboard-page`
  - Compoe toda a home com resumo + grid de cards
- `project-setup-stepper`
  - Fluxo em 3 passos: Maven -> classes -> revisao
- `metrics-panel`
  - Gauges com alternancia de modo (`before`/`after`) e transicao
- `quality-insights`
  - Feed de feedbacks textuais com recomendacoes
- `diff-viewer`
  - Comparativo de codigo antes/depois em duas colunas

## 7) Roteamento
Arquivo: `src/app/app.routes.ts`

Estado atual:
- `/` -> DashboardPageComponent
- wildcard `**` -> redireciona para `/`

Nao ha multiplas paginas de navegacao ainda; tudo esta consolidado na dashboard principal.

## 8) Tema Visual e Design System
Arquivo principal: `src/styles.scss`

Padrao aplicado:
- Base clara (branco + cinzas ultra-claros)
- Azul soft para identidade principal
- Verde esmeralda para indicadores positivos (Mutation Score)
- Ambar para alertas (mutantes sobreviventes)
- Bordas arredondadas (`12px`, `16px`, `18px`)
- Sombras suaves (`--shadow-soft*`)
- Tipografia: `Inter` (fallback Roboto)

## 9) Dados da Interface (Mock)
Todos os dados estao em:
- `src/app/core/services/studio-data.service.ts`

Conjuntos de dados atuais:
- `quickStats` (cards de resumo)
- `projectSetup` (Maven + classes)
- `gaugeMetrics` (valores antes/depois)
- `qualityInsights` (mensagens de insights)
- `diffSnapshot` (linhas de diff antes/depois)

## 10) Estado de Qualidade Tecnica
### Build
- `npm run build` executa com sucesso.
- Existe warning de budget inicial do bundle (acima de 500kb).

### Testes
- Existe apenas teste basico de criacao do App (`app.spec.ts`).
- Nao ha testes especificos dos componentes de feature neste momento.

## 11) Limitacoes Atuais
- Sem integracao com backend/API real
- Sem persistencia de configuracoes
- Stepper nao executa Maven real (somente UX)
- Chart.js/ng2-charts ainda nao usados
- Sem autenticacao/autorizacao
- Sem pagina de configuracoes separada

## 12) Proximos Passos Recomendados
1. Conectar `StudioDataService` a uma API local (HTTP) com DTOs reais.
2. Implementar execucao real de pipeline (Maven + PIT) via backend/agent local.
3. Adicionar estado global para carregamento/erro/sucesso por etapa.
4. Criar testes unitarios para componentes (`metrics-panel`, `stepper`, `diff-viewer`).
5. Ajustar budgets de build e lazy loading para reduzir bundle inicial.
6. Decidir uso real de `chart.js`/`ng2-charts` ou remover dependencia.

