import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolve } from 'node:path';
import { existsSync, rmSync, readFileSync } from 'node:fs';
import * as yaml from 'js-yaml';
import { runConvert } from '../convert.js';

const FIXTURES = resolve(process.cwd(), 'fixtures');
const TMP_DIR = resolve(process.cwd(), '.tmp-test-convert');

let stdoutData: string[];

beforeEach(() => {
  stdoutData = [];
  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    stdoutData.push(args.map(String).join(' '));
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
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

describe('convert command', () => {
  it('converts JSON to YAML', async () => {
    const outPath = resolve(TMP_DIR, 'patient.yaml');
    await runConvert(resolve(FIXTURES, 'patient-valid.json'), outPath, {});
    expect(existsSync(outPath)).toBe(true);

    const content = readFileSync(outPath, 'utf-8');
    expect(content).toContain('resourceType: Patient');
    expect(content).toContain('family: Smith');
    expect(process.exitCode).toBe(0);
  });

  it('converts YAML to JSON', async () => {
    const outPath = resolve(TMP_DIR, 'patient-from-yaml.json');
    await runConvert(resolve(FIXTURES, 'patient-valid.yaml'), outPath, {});
    expect(existsSync(outPath)).toBe(true);

    const content = readFileSync(outPath, 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed.resourceType).toBe('Patient');
    expect(parsed.id).toBe('patient-yaml');
    expect(process.exitCode).toBe(0);
  });

  it('converts Observation JSON to YAML', async () => {
    const outPath = resolve(TMP_DIR, 'obs.yaml');
    await runConvert(resolve(FIXTURES, 'observation-valid.json'), outPath, {});
    expect(existsSync(outPath)).toBe(true);

    const content = readFileSync(outPath, 'utf-8');
    const obj = yaml.load(content) as Record<string, unknown>;
    expect(obj.resourceType).toBe('Observation');
    expect(obj.status).toBe('final');
    expect(process.exitCode).toBe(0);
  });

  it('uses --from and --to flags to override format detection', async () => {
    const outPath = resolve(TMP_DIR, 'patient.out');
    await runConvert(resolve(FIXTURES, 'patient-valid.json'), outPath, { from: 'json', to: 'yaml' });
    expect(existsSync(outPath)).toBe(true);

    const content = readFileSync(outPath, 'utf-8');
    expect(content).toContain('resourceType: Patient');
    expect(process.exitCode).toBe(0);
  });

  it('throws when source and target formats are the same', async () => {
    const outPath = resolve(TMP_DIR, 'patient-copy.json');
    await expect(
      runConvert(resolve(FIXTURES, 'patient-valid.json'), outPath, {}),
    ).rejects.toThrow('same');
  });

  it('throws for non-existent input file', async () => {
    const outPath = resolve(TMP_DIR, 'out.yaml');
    await expect(
      runConvert(resolve(FIXTURES, 'nope.json'), outPath, {}),
    ).rejects.toThrow();
  });

  it('preserves all fields during JSON→YAML→JSON roundtrip', async () => {
    const yamlPath = resolve(TMP_DIR, 'roundtrip.yaml');
    const jsonPath = resolve(TMP_DIR, 'roundtrip.json');

    await runConvert(resolve(FIXTURES, 'patient-valid.json'), yamlPath, {});
    await runConvert(yamlPath, jsonPath, {});

    const original = JSON.parse(readFileSync(resolve(FIXTURES, 'patient-valid.json'), 'utf-8'));
    const roundtripped = JSON.parse(readFileSync(jsonPath, 'utf-8'));

    expect(roundtripped.resourceType).toBe(original.resourceType);
    expect(roundtripped.id).toBe(original.id);
    expect(roundtripped.gender).toBe(original.gender);
    expect(roundtripped.birthDate).toBe(original.birthDate);
    expect(roundtripped.name[0].family).toBe(original.name[0].family);
    expect(process.exitCode).toBe(0);
  });

  it('converts a Bundle to YAML', async () => {
    const outPath = resolve(TMP_DIR, 'bundle.yaml');
    await runConvert(resolve(FIXTURES, 'bundle-transaction.json'), outPath, {});
    expect(existsSync(outPath)).toBe(true);

    const content = readFileSync(outPath, 'utf-8');
    expect(content).toContain('resourceType: Bundle');
    expect(content).toContain('type: transaction');
    expect(process.exitCode).toBe(0);
  });
});
