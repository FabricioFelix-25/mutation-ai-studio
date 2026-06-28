# Passo a Passo - Funcionamento Front + Backend

## Objetivo
Descrever como sera o funcionamento completo da aplicacao quando o frontend Angular estiver conectado ao backend real.

## Premissas (assumidas)
- API HTTP REST para comandos e consultas
- SSE (Server-Sent Events) ou WebSocket para progresso em tempo real
- Backend responsavel por executar Maven + PIT + analise automatizada
- Frontend responsavel por experiencia do usuario, estado de tela e visualizacao

## Fluxo do Usuario + Fluxo do Codigo

1. Usuario abre a dashboard
- Frontend carrega `DashboardPageComponent` pela rota `/`.
- `StudioApiService` chama `GET /api/projects/summary`.
- UI mostra loading nos cards e depois exibe resumo (score, mutantes, tempo).

2. Usuario informa caminho do Maven no stepper
- No `project-setup-stepper`, usuario preenche o caminho Maven.
- Frontend envia validacao para backend: `POST /api/projects/validate-maven`.
- Backend responde `valid/invalid` e detalhes; frontend libera proximo passo.

3. Usuario seleciona classes alvo
- Frontend busca classes disponiveis: `GET /api/projects/{projectId}/classes`.
- Usuario marca classes na lista com badges de prioridade.
- Frontend guarda selecao local no estado (signals/store).

4. Usuario clica em "Executar mutation tests"
- Frontend envia comando de execucao:
  `POST /api/mutation-runs`
  com payload `{ projectId, mavenPath, classes[] }`.
- Backend cria `runId` e retorna status inicial (`queued`).

5. Frontend inicia acompanhamento em tempo real
- Com `runId`, frontend abre stream:
  `GET /api/mutation-runs/{runId}/events` (SSE) ou canal WS.
- Eventos de progresso chegam (queued, running, class-start, class-done, finished, failed).

6. Backend executa pipeline
- Backend roda Maven/PIT por classe ou lote.
- Backend calcula metricas antes/depois e mutantes sobreviventes.
- Backend emite eventos parciais para o frontend durante o processamento.

7. Frontend atualiza metricas da tela
- Ao receber evento de metricas, frontend consulta:
  `GET /api/mutation-runs/{runId}/metrics`.
- `metrics-panel` atualiza gauges com transicao suave antes/depois.

8. Frontend atualiza feedback de qualidade
- Frontend busca feedback textual:
  `GET /api/mutation-runs/{runId}/insights`.
- `quality-insights` mostra explicacoes e recomendacoes praticas por classe/regra.

9. Frontend atualiza visualizador Diff
- Usuario seleciona classe ou diff sugerido.
- Frontend busca diff:
  `GET /api/mutation-runs/{runId}/diffs/{classId}`.
- `diff-viewer` renderiza lado a lado (antes x depois) com cores pastel.

10. Execucao finaliza
- Evento final `finished` chega no stream.
- Frontend fecha stream, atualiza status final e habilita acoes:
  "Executar novamente", "Exportar relatorio", "Aplicar sugestoes".

11. Usuario revisa e decide proximo ciclo
- Pode reexecutar para outra selecao de classes.
- Pode abrir diff de outra classe.
- Pode exportar os resultados para auditoria/CI.

## Como isso fica no codigo Angular (adaptacao)

1. Substituir dados mockados por API
- Trocar `StudioDataService` (mock) por `StudioApiService` com `HttpClient`.
- Manter os mesmos modelos em `core/models/studio.models.ts` (ou evoluir para DTOs).

2. Criar um store de execucao
- Exemplo: `MutationRunStore` com signals para:
  - `runId`
  - `status`
  - `progress`
  - `metrics`
  - `qualityInsights`
  - `diffSnapshot`

3. Ligar cada feature ao store
- `project-setup-stepper`: inicia run e salva `runId`.
- `metrics-panel`: observa `metrics` e atualiza gauges.
- `quality-insights`: observa `qualityInsights`.
- `diff-viewer`: busca/renderiza diff por classe.

4. Tratar stream em servico dedicado
- `MutationRunStreamService` abre/fecha SSE.
- Converte eventos para updates no store.
- Implementa reconexao com retry exponencial.

## Contrato de API sugerido (base)

### POST /api/mutation-runs
Request:
```json
{
  "projectId": "mutation-studio-backend",
  "mavenPath": "C:\\tools\\apache-maven-3.9.9\\bin\\mvn.cmd",
  "classes": ["UserServiceTest", "InvoiceFacadeTest"]
}
```

Response:
```json
{
  "runId": "run_20260306_001",
  "status": "queued"
}
```

### Event (SSE/WS)
```json
{
  "type": "metrics-updated",
  "runId": "run_20260306_001",
  "timestamp": "2026-03-06T10:40:00Z"
}
```

### GET /api/mutation-runs/{runId}/metrics
```json
{
  "mutationScore": { "before": 74, "after": 88 },
  "assertStrength": { "before": 61, "after": 84 },
  "killedMutants": { "before": 48, "after": 79 }
}
```

## Erros e comportamento esperado

1. Backend indisponivel
- Front mostra estado de erro no card.
- Botao "Tentar novamente" refaz chamada.

2. Maven invalido
- Stepper bloqueia avancar e mostra erro de validacao.

3. Falha durante execucao
- Stream envia `failed` com motivo.
- Front preserva progresso parcial e oferece reexecucao.

4. Timeout de stream
- Reconexao automatica (3 tentativas).
- Se falhar, fallback para polling curto (`GET /status`).

## Resultado esperado para o usuario final
- Processo guiado, sem logs tecnicos poluidos.
- Feedback claro do que melhorou e do que ainda falta.
- Evidencias visuais objetivas: gauges, badges, diff e recomendacoes da rodada.

