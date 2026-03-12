import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolve } from 'node:path';
import { runValidate } from '../validate.js';
import { resetContext } from '../../utils/context.js';

const FIXTURES = resolve(process.cwd(), 'fixtures');

// Capture console output
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

describe('validate command', () => {
  it('validates a valid Patient resource successfully', async () => {
    await runValidate(resolve(FIXTURES, 'patient-valid.json'), {});
    const output = stdoutData.join('\n');
    expect(output).toContain('Patient');
    expect(output).toContain('Passed');
    expect(process.exitCode).toBe(0);
  }, 30000);

  it('validates a minimal Patient resource', async () => {
    await runValidate(resolve(FIXTURES, 'patient-minimal.json'), {});
    const output = stdoutData.join('\n');
    expect(output).toContain('Patient');
    expect(process.exitCode).toBe(0);
  }, 30000);

  it('validates a valid Observation resource', async () => {
    await runValidate(resolve(FIXTURES, 'observation-valid.json'), {});
    const output = stdoutData.join('\n');
    expect(output).toContain('Observation');
    expect(process.exitCode).toBe(0);
  }, 30000);

  it('validates a valid Encounter resource', async () => {
    await runValidate(resolve(FIXTURES, 'encounter-valid.json'), {});
    const output = stdoutData.join('\n');
    expect(output).toContain('Encounter');
    expect(process.exitCode).toBe(0);
  }, 30000);

  it('validates a valid Practitioner resource', async () => {
    await runValidate(resolve(FIXTURES, 'practitioner-valid.json'), {});
    const output = stdoutData.join('\n');
    expect(output).toContain('Practitioner');
    expect(process.exitCode).toBe(0);
  }, 30000);

  it('outputs JSON format when --json is specified', async () => {
    await runValidate(resolve(FIXTURES, 'patient-valid.json'), { json: true });
    const output = stdoutData.join('\n');
    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty('valid');
    expect(parsed).toHaveProperty('resourceType', 'Patient');
    expect(parsed).toHaveProperty('issues');
    expect(process.exitCode).toBe(0);
  }, 30000);

  it('throws for non-existent file', async () => {
    await expect(
      runValidate(resolve(FIXTURES, 'does-not-exist.json'), {}),
    ).rejects.toThrow();
  });

  it('validates a Condition resource', async () => {
    await runValidate(resolve(FIXTURES, 'condition-valid.json'), {});
    const output = stdoutData.join('\n');
    expect(output).toContain('Condition');
    expect(process.exitCode).toBe(0);
  }, 30000);
});
