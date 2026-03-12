import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolve } from 'node:path';
import { existsSync, rmSync, readFileSync } from 'node:fs';
import { runCompose } from '../compose.js';

const FIXTURES = resolve(process.cwd(), 'fixtures');
const TMP_DIR = resolve(process.cwd(), '.tmp-test-compose');

let stdoutData: string[];
let stderrData: string[];

beforeEach(() => {
  stdoutData = [];
  stderrData = [];
  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    stdoutData.push(args.map(String).join(' '));
  });
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    stderrData.push(args.map(String).join(' '));
  });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  process.exitCode = undefined;
});

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
  if (existsSync(TMP_DIR)) {
    rmSync(TMP_DIR, { recursive: true, force: true });
  }
});

describe('compose command', () => {
  it('composes from a YAML template', async () => {
    await runCompose(resolve(FIXTURES, 'patient-template.yaml'), {});
    const output = stdoutData.join('\n');
    expect(output).toContain('Resource composed');
    expect(output).toContain('Patient');
    expect(output).toContain('patient-composed');
    expect(output).toContain('"resourceType": "Patient"');
    expect(process.exitCode).toBe(0);
  });

  it('composes from a JSON file', async () => {
    await runCompose(resolve(FIXTURES, 'patient-valid.json'), {});
    const output = stdoutData.join('\n');
    expect(output).toContain('Resource composed');
    expect(output).toContain('Patient');
    expect(process.exitCode).toBe(0);
  });

  it('writes output to file with --output', async () => {
    const outPath = resolve(TMP_DIR, 'composed.json');
    await runCompose(resolve(FIXTURES, 'patient-template.yaml'), { output: outPath });
    expect(existsSync(outPath)).toBe(true);
    const content = JSON.parse(readFileSync(outPath, 'utf-8'));
    expect(content.resourceType).toBe('Patient');
    expect(content.id).toBe('patient-composed');
    expect(process.exitCode).toBe(0);
  });

  it('composes an Observation resource', async () => {
    await runCompose(resolve(FIXTURES, 'observation-valid.json'), {});
    const output = stdoutData.join('\n');
    expect(output).toContain('Observation');
    expect(process.exitCode).toBe(0);
  });

  it('composes with --validate flag', async () => {
    await runCompose(resolve(FIXTURES, 'patient-valid.json'), { validate: true });
    const output = stdoutData.join('\n');
    expect(output).toContain('Resource composed');
    expect(output).toContain('Validation Passed');
    expect(process.exitCode).toBe(0);
  }, 30000);

  it('throws for non-existent file', async () => {
    await expect(
      runCompose(resolve(FIXTURES, 'nope.yaml'), {}),
    ).rejects.toThrow();
  });

  it('throws for file without resourceType', async () => {
    await expect(
      runCompose(resolve(FIXTURES, 'no-resource-type.json'), {}),
    ).rejects.toThrow();
  });
});
