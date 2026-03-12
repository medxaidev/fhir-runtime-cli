import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolve } from 'node:path';
import { runFhirPath } from '../fhirpath.js';

const FIXTURES = resolve(process.cwd(), 'fixtures');

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
});

describe('fhirpath command', () => {
  it('evaluates a simple path expression (Patient.name.given)', async () => {
    await runFhirPath('Patient.name.given', resolve(FIXTURES, 'patient-valid.json'), {});
    const output = stdoutData.join('\n');
    const parsed = JSON.parse(output);
    expect(parsed).toContain('John');
    expect(process.exitCode).toBe(0);
  });

  it('evaluates Patient.gender', async () => {
    await runFhirPath('Patient.gender', resolve(FIXTURES, 'patient-valid.json'), {});
    const output = stdoutData.join('\n');
    const parsed = JSON.parse(output);
    expect(parsed).toContain('male');
    expect(process.exitCode).toBe(0);
  });

  it('evaluates Patient.birthDate', async () => {
    await runFhirPath('Patient.birthDate', resolve(FIXTURES, 'patient-valid.json'), {});
    const output = stdoutData.join('\n');
    const parsed = JSON.parse(output);
    expect(parsed).toContain('1990-05-15');
    expect(process.exitCode).toBe(0);
  });

  it('evaluates a boolean expression with --boolean flag', async () => {
    await runFhirPath(
      "Patient.name.where(use='official').exists()",
      resolve(FIXTURES, 'patient-valid.json'),
      { boolean: true },
    );
    const output = stdoutData.join('\n');
    expect(output).toBe('true');
    expect(process.exitCode).toBe(0);
  });

  it('evaluates boolean false when no match', async () => {
    await runFhirPath(
      "Patient.name.where(use='temp').exists()",
      resolve(FIXTURES, 'patient-valid.json'),
      { boolean: true },
    );
    const output = stdoutData.join('\n');
    expect(output).toBe('false');
    expect(process.exitCode).toBe(0);
  });

  it('outputs JSON format with --json flag', async () => {
    await runFhirPath('Patient.name.family', resolve(FIXTURES, 'patient-valid.json'), { json: true });
    const output = stdoutData.join('\n');
    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty('expression', 'Patient.name.family');
    expect(parsed).toHaveProperty('results');
    expect(parsed.results).toContain('Smith');
    expect(process.exitCode).toBe(0);
  });

  it('works with Observation resource (Observation.status)', async () => {
    await runFhirPath('Observation.status', resolve(FIXTURES, 'observation-valid.json'), {});
    const output = stdoutData.join('\n');
    const parsed = JSON.parse(output);
    expect(parsed).toContain('final');
    expect(process.exitCode).toBe(0);
  });

  it('evaluates nested path on Observation component', async () => {
    await runFhirPath(
      'Observation.component.code.coding.code',
      resolve(FIXTURES, 'observation-valid.json'),
      {},
    );
    const output = stdoutData.join('\n');
    const parsed = JSON.parse(output);
    expect(parsed).toContain('8480-6');
    expect(parsed).toContain('8462-4');
    expect(process.exitCode).toBe(0);
  });

  it('throws for non-existent file', async () => {
    await expect(
      runFhirPath('Patient.name', resolve(FIXTURES, 'nope.json'), {}),
    ).rejects.toThrow();
  });

  it('throws for empty expression', async () => {
    await expect(
      runFhirPath('', resolve(FIXTURES, 'patient-valid.json'), {}),
    ).rejects.toThrow();
  });
});
