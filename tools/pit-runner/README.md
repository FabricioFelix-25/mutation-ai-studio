Runner HTTP local para execucao do PIT fora do backend.

Uso:

```bash
npm run start:pit-runner
```

Endpoints:

- `GET /health`
- `POST /run-pit`

Payload esperado:

```json
{
  "projectPath": "/abs/path/do/projeto",
  "mavenPath": "/abs/path/do/mvnw",
  "targetClasses": ["com.exemplo.service.*"],
  "targetTests": ["com.exemplo.service.*Test"]
}
```

Porta padrao:

- `127.0.0.1:17845`

Variaveis opcionais:

- `MUTATION_AI_PIT_RUNNER_HOST`
- `MUTATION_AI_PIT_RUNNER_PORT`
- `MUTATION_AI_PIT_RUNNER_TIMEOUT_MS`
- `MUTATION_AI_PIT_RUNNER_MAX_LINES`
