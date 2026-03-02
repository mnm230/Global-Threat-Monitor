#!/usr/bin/env node
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const distFile = join(__dirname, 'dist', 'index.cjs');

let cmd, args;

if (isProd && existsSync(distFile)) {
  // Production: run the compiled output
  cmd = 'node';
  args = [distFile];
} else {
  // Development: run TypeScript directly via tsx
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';
  cmd = 'npx';
  args = ['tsx', 'server/index.ts'];
}

const child = spawn(cmd, args, { stdio: 'inherit', env: process.env });
child.on('exit', (code) => process.exit(code ?? 0));
