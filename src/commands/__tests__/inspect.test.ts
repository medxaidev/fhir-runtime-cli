import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolve } from 'node:path';
import { runInspect } from '../inspect.js';

const FIXTURES = resolve(process.cwd(), 'fixtures');

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
});

describe('inspect command', () => {
  it('lists top-level fields of a Patient resource', async () => {
    await runInspect(resolve(FIXTURES, 'patient-valid.json'), {});
    const output = stdoutData.join('\n');
    expect(output).toContain('Patient');
    expect(output).toContain('name');
    expect(output).toContain('gender');
    expect(output).toContain('birthDate');
    expect(process.exitCode).toBe(0);
  });

  it('lists fields of an Observation resource', async () => {
    await runInspect(resolve(FIXTURES, 'observation-valid.json'), {});
    const output = stdoutData.join('\n');
    expect(output).toContain('Observation');
    expect(output).toContain('status');
    expect(output).toContain('code');
    expect(output).toContain('component');
    expect(process.exitCode).toBe(0);
  });

  it('displays tree structure with --tree flag', async () => {
    await runInspect(resolve(FIXTURES, 'patient-valid.json'), { tree: true });
    const output = stdoutData.join('\n');
    expect(output).toContain('Patient');
    expect(output).toContain('├');
    expect(output).toContain('name');
    expect(output).toContain('family');
    expect(output).toContain('given');
    expect(process.exitCode).toBe(0);
  });

  it('displays tree for a deeply nested resource', async () => {
    await runInspect(resolve(FIXTURES, 'patient-nested.json'), { tree: true });
    const output = stdoutData.join('\n');
    expect(output).toContain('Patient');
    expect(output).toContain('contact');
    expect(output).toContain('communication');
    expect(process.exitCode).toBe(0);
  });

  it('outputs JSON format with --json flag', async () => {
    await runInspect(resolve(FIXTURES, 'patient-valid.json'), { json: true });
    const output = stdoutData.join('\n');
    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty('resourceType', 'Patient');
    expect(parsed).toHaveProperty('fieldCount');
    expect(parsed.fieldCount).toBeGreaterThan(0);
    expect(parsed).toHaveProperty('fields');
    expect(Array.isArray(parsed.fields)).toBe(true);
    expect(parsed.fields[0]).toHaveProperty('name');
    expect(parsed.fields[0]).toHaveProperty('type');
    expect(process.exitCode).toBe(0);
  });

  it('inspects a minimal Patient resource', async () => {
    await runInspect(resolve(FIXTURES, 'patient-minimal.json'), {});
    const output = stdoutData.join('\n');
    expect(output).toContain('Patient');
    expect(output).toContain('resourceType');
    expect(output).toContain('id');
    expect(process.exitCode).toBe(0);
  });

  it('inspects a MedicationRequest resource', async () => {
    await runInspect(resolve(FIXTURES, 'medication-request.json'), {});
    const output = stdoutData.join('\n');
    expect(output).toContain('MedicationRequest');
    expect(output).toContain('status');
    expect(output).toContain('intent');
    expect(process.exitCode).toBe(0);
  });

  it('throws for non-existent file', async () => {
    await expect(
      runInspect(resolve(FIXTURES, 'nope.json'), {}),
    ).rejects.toThrow();
  });

  it('inspects a Bundle resource', async () => {
    await runInspect(resolve(FIXTURES, 'bundle-transaction.json'), {});
    const output = stdoutData.join('\n');
    expect(output).toContain('Bundle');
    expect(output).toContain('entry');
    expect(process.exitCode).toBe(0);
  });

  it('JSON output for Observation includes component fields', async () => {
    await runInspect(resolve(FIXTURES, 'observation-valid.json'), { json: true });
    const output = stdoutData.join('\n');
    const parsed = JSON.parse(output);
    expect(parsed.resourceType).toBe('Observation');
    const fieldNames = parsed.fields.map((f: { name: string }) => f.name);
    expect(fieldNames).toContain('component');
    expect(fieldNames).toContain('subject');
    expect(process.exitCode).toBe(0);
  });
});
