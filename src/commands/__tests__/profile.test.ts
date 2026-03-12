import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolve } from 'node:path';
import { existsSync, rmSync, readFileSync } from 'node:fs';
import { runProfileShow, runProfileSnapshot, runProfileValidate } from '../profile.js';

const FIXTURES = resolve(process.cwd(), 'fixtures');
const TMP_DIR = resolve(process.cwd(), '.tmp-test-profile');

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

// ─── profile show ───────────────────────────────────────────────────────────

describe('profile show', () => {
  it('shows core Patient profile by URL', async () => {
    await runProfileShow('http://hl7.org/fhir/StructureDefinition/Patient', {});
    const output = stdoutData.join('\n');
    expect(output).toContain('Patient');
    expect(output).toContain('resource');
    expect(process.exitCode).toBe(0);
  }, 30000);

  it('shows core Observation profile by URL', async () => {
    await runProfileShow('http://hl7.org/fhir/StructureDefinition/Observation', {});
    const output = stdoutData.join('\n');
    expect(output).toContain('Observation');
    expect(output).toContain('resource');
    expect(process.exitCode).toBe(0);
  }, 30000);

  it('shows a local StructureDefinition file', async () => {
    await runProfileShow(resolve(FIXTURES, 'sd-my-patient.json'), {});
    const output = stdoutData.join('\n');
    expect(output).toContain('MyPatient');
    expect(process.exitCode).toBe(0);
  }, 30000);

  it('shows full metadata with --full', async () => {
    await runProfileShow('http://hl7.org/fhir/StructureDefinition/Patient', { full: true });
    const output = stdoutData.join('\n');
    expect(output).toContain('Patient');
    expect(output).toContain('Status');
    expect(process.exitCode).toBe(0);
  }, 30000);

  it('outputs JSON format with --json', async () => {
    await runProfileShow('http://hl7.org/fhir/StructureDefinition/Patient', { json: true });
    const output = stdoutData.join('\n');
    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty('url');
    expect(parsed).toHaveProperty('name', 'Patient');
    expect(parsed).toHaveProperty('elements');
    expect(parsed.elements.length).toBeGreaterThan(0);
    expect(parsed.elements[0]).toHaveProperty('path');
    expect(process.exitCode).toBe(0);
  }, 30000);

  it('throws for non-existent URL', async () => {
    await expect(
      runProfileShow('http://hl7.org/fhir/StructureDefinition/FakeResource', {}),
    ).rejects.toThrow();
  }, 30000);

  it('throws for non-SD file', async () => {
    await expect(
      runProfileShow(resolve(FIXTURES, 'patient-valid.json'), {}),
    ).rejects.toThrow();
  });
});

// ─── profile snapshot ───────────────────────────────────────────────────────

describe('profile snapshot', () => {
  it('generates snapshot to stdout', async () => {
    await runProfileSnapshot(resolve(FIXTURES, 'sd-my-patient.json'), {});
    const output = stdoutData.join('\n');
    const parsed = JSON.parse(output);
    expect(parsed.resourceType).toBe('StructureDefinition');
    expect(parsed.snapshot).toBeDefined();
    expect(parsed.snapshot.element.length).toBeGreaterThan(0);
    expect(process.exitCode).toBe(0);
  }, 30000);

  it('writes snapshot to file with --output', async () => {
    const outPath = resolve(TMP_DIR, 'snapshot.json');
    await runProfileSnapshot(resolve(FIXTURES, 'sd-my-patient.json'), { output: outPath });
    expect(existsSync(outPath)).toBe(true);
    const content = JSON.parse(readFileSync(outPath, 'utf-8'));
    expect(content.resourceType).toBe('StructureDefinition');
    expect(content.snapshot).toBeDefined();
    const successOutput = stdoutData.join('\n');
    expect(successOutput).toContain('Snapshot generated');
    expect(process.exitCode).toBe(0);
  }, 30000);

  it('snapshot contains required fields from differential', async () => {
    await runProfileSnapshot(resolve(FIXTURES, 'sd-my-patient.json'), {});
    const output = stdoutData.join('\n');
    const parsed = JSON.parse(output);
    const elements = parsed.snapshot.element;
    const nameEl = elements.find((e: { path: string }) => e.path === 'Patient.name');
    expect(nameEl).toBeDefined();
    expect(nameEl.min).toBe(1);
    expect(process.exitCode).toBe(0);
  }, 30000);

  it('throws for non-SD file', async () => {
    await expect(
      runProfileSnapshot(resolve(FIXTURES, 'patient-valid.json'), {}),
    ).rejects.toThrow();
  });

  it('throws for non-existent file', async () => {
    await expect(
      runProfileSnapshot(resolve(FIXTURES, 'nope.json'), {}),
    ).rejects.toThrow();
  });
});

// ─── profile validate ───────────────────────────────────────────────────────

describe('profile validate', () => {
  it('validates a valid StructureDefinition', async () => {
    await runProfileValidate(resolve(FIXTURES, 'sd-my-patient.json'), {});
    const output = stdoutData.join('\n');
    expect(output).toContain('MyPatient');
    expect(output).toContain('passed');
    expect(process.exitCode).toBe(0);
  }, 30000);

  it('reports errors for SD missing required fields', async () => {
    await runProfileValidate(resolve(FIXTURES, 'sd-invalid.json'), {});
    const output = [...stdoutData, ...stderrData].join('\n');
    expect(output).toContain('error');
    expect(output).toContain('url');
    expect(output).toContain('name');
    expect(process.exitCode).toBe(1);
  }, 30000);

  it('outputs JSON format for valid SD', async () => {
    await runProfileValidate(resolve(FIXTURES, 'sd-my-patient.json'), { json: true });
    const output = stdoutData.join('\n');
    const parsed = JSON.parse(output);
    expect(parsed.valid).toBe(true);
    expect(parsed.name).toBe('MyPatient');
    expect(parsed.url).toContain('MyPatient');
    expect(process.exitCode).toBe(0);
  }, 30000);

  it('outputs JSON format for invalid SD', async () => {
    await runProfileValidate(resolve(FIXTURES, 'sd-invalid.json'), { json: true });
    const output = stdoutData.join('\n');
    const parsed = JSON.parse(output);
    expect(parsed.valid).toBe(false);
    expect(parsed.errors).toBeGreaterThan(0);
    expect(process.exitCode).toBe(1);
  }, 30000);

  it('throws for non-SD file', async () => {
    await expect(
      runProfileValidate(resolve(FIXTURES, 'patient-valid.json'), {}),
    ).rejects.toThrow();
  });
});
