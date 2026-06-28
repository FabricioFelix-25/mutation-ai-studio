import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { access, readdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const HOST = process.env.MUTATION_AI_PIT_RUNNER_HOST ?? '127.0.0.1';
const PORT = Number(process.env.MUTATION_AI_PIT_RUNNER_PORT ?? '17845');
const RUN_TIMEOUT_MS = Number(process.env.MUTATION_AI_PIT_RUNNER_TIMEOUT_MS ?? String(25 * 60 * 1000));
const MAX_OUTPUT_LINES = Number(process.env.MUTATION_AI_PIT_RUNNER_MAX_LINES ?? '400');

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') {
      return writeJson(res, 200, { status: 'ok' });
    }

    if (req.method === 'POST' && req.url === '/run-pit') {
      const payload = await readJson(req);
      validatePayload(payload);

      const command = buildCommand(payload);
      const result = await runCommand(payload.projectPath, command);
      return writeJson(res, 200, result);
    }

    if (req.method === 'POST' && req.url === '/run-tests') {
      const payload = await readJson(req);
      validatePayload(payload);

      const command = [payload.mavenPath, '-B', '-Dstyle.color=never', '-DskipTests=false', 'test'];
      const result = await runCommand(payload.projectPath, command);
      return writeJson(res, 200, result);
    }

    writeJson(res, 404, { error: 'Not found' });
  } catch (error) {
    writeJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[pit-runner] listening on http://${HOST}:${PORT}`);
});

async function readJson(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return raw ? JSON.parse(raw) : {};
}

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payload invalido.');
  }

  if (!payload.projectPath || typeof payload.projectPath !== 'string') {
    throw new Error('projectPath obrigatorio.');
  }

  if (!payload.mavenPath || typeof payload.mavenPath !== 'string') {
    throw new Error('mavenPath obrigatorio.');
  }
}

function buildCommand(payload) {
  const command = [payload.mavenPath, '-B', '-Dstyle.color=never'];
  const targetClasses = normalizePatterns(payload.targetClasses);
  const targetTests = normalizePatterns(payload.targetTests);

  if (targetClasses.length > 0) {
    command.push(`-DtargetClasses=${targetClasses.join(',')}`);
  }

  if (targetTests.length > 0) {
    command.push(`-DtargetTests=${targetTests.join(',')}`);
  }

  command.push('pitest:mutationCoverage');
  return command;
}

function normalizePatterns(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0);
}

async function runCommand(projectPath, command) {
  await access(projectPath, constants.R_OK | constants.X_OK);
  await access(command[0], constants.R_OK | constants.X_OK);

  const startedAt = Date.now();
  const outputLines = [];

  return await new Promise((resolve) => {
    const child = spawn(command[0], command.slice(1), {
      cwd: projectPath,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let timedOut = false;
    let stdoutBuffer = '';
    let stderrBuffer = '';

    const pushLine = (line) => {
      const normalized = line.trimEnd();
      if (!normalized) {
        return;
      }
      outputLines.push(normalized);
      if (outputLines.length > MAX_OUTPUT_LINES) {
        outputLines.shift();
      }
    };

    const flushBuffer = (buffer) => {
      const parts = buffer.split(/\r?\n/);
      const remaining = parts.pop() ?? '';
      for (const part of parts) {
        pushLine(part);
      }
      return remaining;
    };

    child.stdout.on('data', (chunk) => {
      stdoutBuffer += chunk.toString('utf8');
      stdoutBuffer = flushBuffer(stdoutBuffer);
    });

    child.stderr.on('data', (chunk) => {
      stderrBuffer += chunk.toString('utf8');
      stderrBuffer = flushBuffer(stderrBuffer);
    });

    child.on('error', (error) => {
      resolve({
        command,
        exitCode: 1,
        timedOut: false,
        durationMs: Date.now() - startedAt,
        outputLines: [`Falha ao iniciar runner local: ${error.message}`],
        reportPath: null,
      });
    });

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, RUN_TIMEOUT_MS);

    child.on('close', async (code) => {
      clearTimeout(timeout);
      if (stdoutBuffer.trim()) {
        pushLine(stdoutBuffer);
      }
      if (stderrBuffer.trim()) {
        pushLine(stderrBuffer);
      }

      resolve({
        command,
        exitCode: code ?? (timedOut ? -1 : 1),
        timedOut,
        durationMs: Date.now() - startedAt,
        outputLines,
        reportPath: await findLatestMutationsXml(projectPath),
      });
    });
  });
}

async function findLatestMutationsXml(projectPath) {
  const pitReportsDir = path.join(projectPath, 'target', 'pit-reports');
  const candidates = [];

  async function visit(currentPath) {
    let entries;
    try {
      entries = await readdir(currentPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const absolutePath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath);
        continue;
      }

      if (entry.isFile() && entry.name === 'mutations.xml') {
        candidates.push(absolutePath);
      }
    }
  }

  await visit(pitReportsDir);
  return candidates.sort().at(-1) ?? null;
}

function writeJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}
