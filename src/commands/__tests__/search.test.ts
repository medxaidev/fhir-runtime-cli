import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolve } from 'node:path';
import { existsSync, rmSync } from 'node:fs';
import { runSearchExtract, runSearchValidate, runSearchCapability } from '../search.js';

const FIXTURES = resolve(process.cwd(), 'fixtures');
const TMP_DIR = resolve(process.cwd(), '.tmp-test-search');

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

// ─── search extract ─────────────────────────────────────────────────────────

describe('search extract', () => {
  it('extracts search values from a patient resource', async () => {
    await runSearchExtract(
      resolve(FIXTURES, 'patient-valid.json'),
      resolve(FIXTURES, 'search-param-name.json'),
      {},
    );
    const output = stdoutData.join('\n');
    expect(output).toContain('Search Index Values');
    expect(output).toContain('Patient');
    expect(output).toContain('name');
    expect(process.exitCode).toBe(0);
  });

  it('outputs JSON format with --json', async () => {
    await runSearchExtract(
      resolve(FIXTURES, 'patient-valid.json'),
      resolve(FIXTURES, 'search-param-name.json'),
      { json: true },
    );
    const output = stdoutData.join('\n');
    const parsed = JSON.parse(output);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0]).toHaveProperty('code', 'name');
    expect(parsed[0]).toHaveProperty('type', 'string');
    expect(process.exitCode).toBe(0);
  });

  it('throws for non-existent resource file', async () => {
    await expect(
      runSearchExtract(
        resolve(FIXTURES, 'nope.json'),
        resolve(FIXTURES, 'search-param-name.json'),
        {},
      ),
    ).rejects.toThrow();
  });

  it('throws for non-SearchParameter file', async () => {
    await expect(
      runSearchExtract(
        resolve(FIXTURES, 'patient-valid.json'),
        resolve(FIXTURES, 'patient-valid.json'),
        {},
      ),
    ).rejects.toThrow();
  });
});

// ─── search validate ────────────────────────────────────────────────────────

describe('search validate', () => {
  it('validates a valid SearchParameter', async () => {
    await runSearchValidate(resolve(FIXTURES, 'search-param-name.json'), {});
    const output = stdoutData.join('\n');
    expect(output).toContain('SearchParameter valid');
    expect(output).toContain('name');
    expect(output).toContain('string');
    expect(output).toContain('Patient');
    expect(process.exitCode).toBe(0);
  });

  it('outputs JSON format for valid SP', async () => {
    await runSearchValidate(resolve(FIXTURES, 'search-param-name.json'), { json: true });
    const output = stdoutData.join('\n');
    const parsed = JSON.parse(output);
    expect(parsed.valid).toBe(true);
    expect(parsed.code).toBe('name');
    expect(parsed.type).toBe('string');
    expect(parsed.base).toContain('Patient');
    expect(process.exitCode).toBe(0);
  });

  it('reports invalid SearchParameter', async () => {
    await runSearchValidate(resolve(FIXTURES, 'search-param-invalid.json'), {});
    const allOutput = [...stdoutData, ...stderrData].join('\n');
    expect(allOutput).toContain('invalid');
    expect(process.exitCode).toBe(1);
  });

  it('outputs JSON format for invalid SP', async () => {
    await runSearchValidate(resolve(FIXTURES, 'search-param-invalid.json'), { json: true });
    const output = stdoutData.join('\n');
    const parsed = JSON.parse(output);
    expect(parsed.valid).toBe(false);
    expect(process.exitCode).toBe(1);
  });

  it('throws for non-SearchParameter file', async () => {
    await expect(
      runSearchValidate(resolve(FIXTURES, 'patient-valid.json'), {}),
    ).rejects.toThrow();
  });
});

// ─── search capability ──────────────────────────────────────────────────────

describe('search capability', () => {
  it('generates capability fragment from a profile', async () => {
    await runSearchCapability(
      [resolve(FIXTURES, 'sd-my-patient.json')],
      {},
    );
    const output = stdoutData.join('\n');
    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty('mode', 'server');
    expect(parsed).toHaveProperty('resource');
    expect(process.exitCode).toBe(0);
  });

  it('generates with multiple profiles', async () => {
    await runSearchCapability(
      [
        resolve(FIXTURES, 'sd-my-patient.json'),
        resolve(FIXTURES, 'mock-ig', 'StructureDefinition-MockObservation.json'),
      ],
      {},
    );
    const output = stdoutData.join('\n');
    const parsed = JSON.parse(output);
    expect(parsed.resource.length).toBeGreaterThanOrEqual(2);
    expect(process.exitCode).toBe(0);
  });

  it('throws for non-SD file', async () => {
    await expect(
      runSearchCapability([resolve(FIXTURES, 'patient-valid.json')], {}),
    ).rejects.toThrow();
  });

  it('throws when no profile files provided', async () => {
    await expect(
      runSearchCapability([], {}),
    ).rejects.toThrow();
  });
});
