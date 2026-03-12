import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolve } from 'node:path';
import { existsSync, rmSync, readFileSync } from 'node:fs';
import { runBundleAnalyze, runBundleExtract, runBundleRefs } from '../bundle.js';

const FIXTURES = resolve(process.cwd(), 'fixtures');
const TMP_DIR = resolve(process.cwd(), '.tmp-test-bundle');

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

// ─── bundle analyze ─────────────────────────────────────────────────────────

describe('bundle analyze', () => {
  it('analyzes a transaction bundle', async () => {
    await runBundleAnalyze(resolve(FIXTURES, 'bundle-transaction.json'), {});
    const output = stdoutData.join('\n');
    expect(output).toContain('transaction');
    expect(output).toContain('4');
    expect(output).toContain('Patient');
    expect(output).toContain('Observation');
    expect(process.exitCode).toBe(0);
  });

  it('analyzes a collection bundle', async () => {
    await runBundleAnalyze(resolve(FIXTURES, 'bundle-collection.json'), {});
    const output = stdoutData.join('\n');
    expect(output).toContain('collection');
    expect(output).toContain('6');
    expect(output).toContain('Patient');
    expect(output).toContain('Observation');
    expect(output).toContain('Encounter');
    expect(process.exitCode).toBe(0);
  });

  it('outputs JSON format with --json', async () => {
    await runBundleAnalyze(resolve(FIXTURES, 'bundle-collection.json'), { json: true });
    const output = stdoutData.join('\n');
    const parsed = JSON.parse(output);
    expect(parsed.bundleType).toBe('collection');
    expect(parsed.totalEntries).toBe(6);
    expect(parsed.resourceCounts).toHaveProperty('Patient', 2);
    expect(parsed.resourceCounts).toHaveProperty('Observation', 3);
    expect(parsed.resourceCounts).toHaveProperty('Encounter', 1);
    expect(process.exitCode).toBe(0);
  });

  it('shows verbose entry details with --verbose', async () => {
    await runBundleAnalyze(resolve(FIXTURES, 'bundle-collection.json'), { verbose: true });
    const output = stdoutData.join('\n');
    expect(output).toContain('#1');
    expect(output).toContain('patient-1');
    expect(output).toContain('obs-1');
    expect(process.exitCode).toBe(0);
  });

  it('outputs JSON with verbose entries', async () => {
    await runBundleAnalyze(resolve(FIXTURES, 'bundle-collection.json'), { json: true, verbose: true });
    const output = stdoutData.join('\n');
    const parsed = JSON.parse(output);
    expect(parsed.entries).toBeDefined();
    expect(parsed.entries.length).toBe(6);
    expect(parsed.entries[0]).toHaveProperty('resourceType', 'Patient');
    expect(parsed.entries[0]).toHaveProperty('id', 'patient-1');
    expect(process.exitCode).toBe(0);
  });

  it('throws for non-Bundle resource', async () => {
    await expect(
      runBundleAnalyze(resolve(FIXTURES, 'patient-valid.json'), {}),
    ).rejects.toThrow();
  });

  it('throws for non-existent file', async () => {
    await expect(
      runBundleAnalyze(resolve(FIXTURES, 'nope.json'), {}),
    ).rejects.toThrow();
  });
});

// ─── bundle extract ─────────────────────────────────────────────────────────

describe('bundle extract', () => {
  it('extracts all resources to stdout', async () => {
    await runBundleExtract(resolve(FIXTURES, 'bundle-collection.json'), {});
    const output = stdoutData.join('\n');
    expect(output).toContain('"resourceType": "Patient"');
    expect(output).toContain('"resourceType": "Observation"');
    expect(process.exitCode).toBe(0);
  });

  it('filters by --type Patient', async () => {
    await runBundleExtract(resolve(FIXTURES, 'bundle-collection.json'), { type: 'Patient' });
    const output = stdoutData.join('\n');
    expect(output).toContain('"resourceType": "Patient"');
    expect(output).not.toContain('"resourceType": "Observation"');
    expect(process.exitCode).toBe(0);
  });

  it('filters by --type Observation', async () => {
    await runBundleExtract(resolve(FIXTURES, 'bundle-collection.json'), { type: 'Observation' });
    const output = stdoutData.join('\n');
    expect(output).toContain('"resourceType": "Observation"');
    expect(output).not.toContain('"resourceType": "Encounter"');
    expect(process.exitCode).toBe(0);
  });

  it('writes to output directory with --output', async () => {
    await runBundleExtract(resolve(FIXTURES, 'bundle-collection.json'), {
      type: 'Patient',
      output: TMP_DIR,
    });
    const output = stdoutData.join('\n');
    expect(output).toContain('Extracted 2 resource(s)');
    expect(existsSync(resolve(TMP_DIR, 'Patient-patient-1.json'))).toBe(true);
    expect(existsSync(resolve(TMP_DIR, 'Patient-patient-2.json'))).toBe(true);

    const content = JSON.parse(readFileSync(resolve(TMP_DIR, 'Patient-patient-1.json'), 'utf-8'));
    expect(content.resourceType).toBe('Patient');
    expect(content.id).toBe('patient-1');
    expect(process.exitCode).toBe(0);
  });

  it('outputs JSON array with --json', async () => {
    await runBundleExtract(resolve(FIXTURES, 'bundle-collection.json'), { type: 'Encounter', json: true });
    const output = stdoutData.join('\n');
    const parsed = JSON.parse(output);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(1);
    expect(parsed[0].resourceType).toBe('Encounter');
    expect(process.exitCode).toBe(0);
  });

  it('handles no matching resources gracefully', async () => {
    await runBundleExtract(resolve(FIXTURES, 'bundle-collection.json'), { type: 'Medication' });
    const errOutput = stderrData.join('\n');
    expect(errOutput).toContain('No Medication resources found');
    expect(process.exitCode).toBe(0);
  });

  it('throws for non-Bundle resource', async () => {
    await expect(
      runBundleExtract(resolve(FIXTURES, 'patient-valid.json'), {}),
    ).rejects.toThrow();
  });
});

// ─── bundle refs ────────────────────────────────────────────────────────────

describe('bundle refs', () => {
  it('extracts references from a collection bundle', async () => {
    await runBundleRefs(resolve(FIXTURES, 'bundle-collection.json'), {});
    const output = stdoutData.join('\n');
    expect(output).toContain('References');
    expect(output).toContain('Patient/patient-1');
    expect(process.exitCode).toBe(0);
  });

  it('outputs JSON format with --json', async () => {
    await runBundleRefs(resolve(FIXTURES, 'bundle-collection.json'), { json: true });
    const output = stdoutData.join('\n');
    const parsed = JSON.parse(output);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
    expect(parsed[0]).toHaveProperty('reference');
    expect(parsed[0]).toHaveProperty('referenceType');
    expect(parsed[0]).toHaveProperty('sourceResource');
    expect(process.exitCode).toBe(0);
  });

  it('filters by --type literal', async () => {
    await runBundleRefs(resolve(FIXTURES, 'bundle-collection.json'), { type: 'literal', json: true });
    const output = stdoutData.join('\n');
    const parsed = JSON.parse(output);
    expect(Array.isArray(parsed)).toBe(true);
    for (const ref of parsed) {
      expect(ref.referenceType).toBe('literal');
    }
    expect(process.exitCode).toBe(0);
  });

  it('extracts refs from transaction bundle', async () => {
    await runBundleRefs(resolve(FIXTURES, 'bundle-transaction.json'), { json: true });
    const output = stdoutData.join('\n');
    const parsed = JSON.parse(output);
    expect(Array.isArray(parsed)).toBe(true);
    const patientRefs = parsed.filter((r: { reference: string }) => r.reference.includes('Patient'));
    expect(patientRefs.length).toBeGreaterThan(0);
    expect(process.exitCode).toBe(0);
  });

  it('throws for non-Bundle resource', async () => {
    await expect(
      runBundleRefs(resolve(FIXTURES, 'patient-valid.json'), {}),
    ).rejects.toThrow();
  });
});
