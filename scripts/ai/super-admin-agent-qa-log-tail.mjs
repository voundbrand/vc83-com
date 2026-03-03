#!/usr/bin/env node
import { spawn } from 'node:child_process';
import process from 'node:process';
import readline from 'node:readline';
import {
  formatQaLogEvent,
  parseQaLogLine,
  qaLogMatchesFilters,
} from './super-admin-agent-qa-log-formatter.mjs';

function parseArgs(argv) {
  const options = {
    run: undefined,
    session: undefined,
    turn: undefined,
    agent: undefined,
    raw: false,
    convexArgs: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];

    if (token === '--session' && typeof next === 'string') {
      options.session = next;
      index += 1;
      continue;
    }
    if (token === '--run' && typeof next === 'string') {
      options.run = next;
      index += 1;
      continue;
    }
    if (token === '--turn' && typeof next === 'string') {
      options.turn = next;
      index += 1;
      continue;
    }
    if (token === '--agent' && typeof next === 'string') {
      options.agent = next;
      index += 1;
      continue;
    }
    if (token === '--raw') {
      options.raw = true;
      continue;
    }
    options.convexArgs.push(token);
  }

  return options;
}

const options = parseArgs(process.argv.slice(2));

const child = spawn('npx', ['convex', 'logs', ...options.convexArgs], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: process.env,
});

const stdoutRl = readline.createInterface({ input: child.stdout });
stdoutRl.on('line', (line) => {
  const event = parseQaLogLine(line);
  if (!event) {
    if (options.raw) {
      process.stdout.write(`${line}\n`);
    }
    return;
  }
  if (!qaLogMatchesFilters(event, options)) {
    return;
  }
  process.stdout.write(`${formatQaLogEvent(event)}\n`);
});

const stderrRl = readline.createInterface({ input: child.stderr });
stderrRl.on('line', (line) => {
  process.stderr.write(`${line}\n`);
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
