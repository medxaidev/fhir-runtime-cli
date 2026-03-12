import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolve } from 'node:path';
import {
  runPackageLoad,
  runPackageList,
  runPackageResolve,
  resetPackageManager,
} from '../package.js';

const FIXTURES = resolve(process.cwd(), 'fixtures');
const MOCK_IG = resolve(FIXTURES, 'mock-ig');

let stdoutData: string[];
let stderrData: string[];

beforeEach(() => {
  stdoutData = [];
  stderrData = [];
  resetPackageManager();
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
  resetPackageManager();
});

// ─── package load ───────────────────────────────────────────────────────────

describe('package load', () => {
  it('loads a mock IG package directory', async () => {
    await runPackageLoad(MOCK_IG, {});
    const output = stdoutData.join('\n');
    expect(output).toContain('Package loaded');
    expect(output).toContain('mock.fhir.test.ig');
    expect(output).toContain('1.0.0');
    expect(process.exitCode).toBe(0);
  });

  it('outputs JSON format with --json', async () => {
    await runPackageLoad(MOCK_IG, { json: true });
    const output = stdoutData.join('\n');
    const parsed = JSON.parse(output);
    expect(parsed.name).toBe('mock.fhir.test.ig');
    expect(parsed.version).toBe('1.0.0');
    expect(parsed.totalResources).toBe(2);
    expect(parsed.fhirVersions).toContain('4.0.1');
    expect(process.exitCode).toBe(0);
  });

  it('shows profiles count', async () => {
    await runPackageLoad(MOCK_IG, { json: true });
    const output = stdoutData.join('\n');
    const parsed = JSON.parse(output);
    expect(parsed.profiles).toBe(2);
    expect(process.exitCode).toBe(0);
  });

  it('throws for non-existent path', async () => {
    await expect(
      runPackageLoad(resolve(FIXTURES, 'nonexistent-ig'), {}),
    ).rejects.toThrow();
  });
});

// ─── package list ───────────────────────────────────────────────────────────

describe('package list', () => {
  it('shows empty list when no packages loaded', async () => {
    await runPackageList({});
    const output = stdoutData.join('\n');
    expect(output).toContain('0');
    expect(process.exitCode).toBe(0);
  });

  it('lists loaded packages after load', async () => {
    await runPackageLoad(MOCK_IG, {});
    stdoutData = [];
    await runPackageList({});
    const output = stdoutData.join('\n');
    expect(output).toContain('mock.fhir.test.ig');
    expect(output).toContain('1');
    expect(process.exitCode).toBe(0);
  });

  it('outputs JSON format with --json', async () => {
    await runPackageLoad(MOCK_IG, {});
    stdoutData = [];
    await runPackageList({ json: true });
    const output = stdoutData.join('\n');
    const parsed = JSON.parse(output);
    expect(parsed.count).toBe(1);
    expect(parsed.packages[0].name).toBe('mock.fhir.test.ig');
    expect(process.exitCode).toBe(0);
  });

  it('shows verbose URLs with --verbose --json', async () => {
    await runPackageLoad(MOCK_IG, {});
    stdoutData = [];
    await runPackageList({ json: true, verbose: true });
    const output = stdoutData.join('\n');
    const parsed = JSON.parse(output);
    expect(parsed.packages[0].urls).toBeDefined();
    expect(parsed.packages[0].urls.length).toBeGreaterThan(0);
    expect(parsed.packages[0].urls).toContain(
      'http://mock.test.ig/fhir/StructureDefinition/MockPatient',
    );
    expect(process.exitCode).toBe(0);
  });

  it('shows verbose text output', async () => {
    await runPackageLoad(MOCK_IG, {});
    stdoutData = [];
    await runPackageList({ verbose: true });
    const output = stdoutData.join('\n');
    expect(output).toContain('MockPatient');
    expect(process.exitCode).toBe(0);
  });
});

// ─── package resolve ────────────────────────────────────────────────────────

describe('package resolve', () => {
  it('resolves a known canonical URL', async () => {
    await runPackageLoad(MOCK_IG, {});
    stdoutData = [];
    await runPackageResolve(
      'http://mock.test.ig/fhir/StructureDefinition/MockPatient',
      {},
    );
    const output = stdoutData.join('\n');
    expect(output).toContain('Resolved');
    expect(output).toContain('mock.fhir.test.ig');
    expect(output).toContain('StructureDefinition');
    expect(process.exitCode).toBe(0);
  });

  it('resolves with JSON output', async () => {
    await runPackageLoad(MOCK_IG, {});
    stdoutData = [];
    await runPackageResolve(
      'http://mock.test.ig/fhir/StructureDefinition/MockPatient',
      { json: true },
    );
    const output = stdoutData.join('\n');
    const parsed = JSON.parse(output);
    expect(parsed.url).toContain('MockPatient');
    expect(parsed.package).toBe('mock.fhir.test.ig');
    expect(parsed.version).toBe('1.0.0');
    expect(parsed.resourceType).toBe('StructureDefinition');
    expect(process.exitCode).toBe(0);
  });

  it('resolves with --show to display full resource', async () => {
    await runPackageLoad(MOCK_IG, {});
    stdoutData = [];
    await runPackageResolve(
      'http://mock.test.ig/fhir/StructureDefinition/MockPatient',
      { json: true, show: true },
    );
    const output = stdoutData.join('\n');
    const parsed = JSON.parse(output);
    expect(parsed.resource).toBeDefined();
    expect(parsed.resource.resourceType).toBe('StructureDefinition');
    expect(parsed.resource.name).toBe('MockPatient');
    expect(process.exitCode).toBe(0);
  });

  it('reports not found for unknown URL', async () => {
    await runPackageLoad(MOCK_IG, {});
    stdoutData = [];
    stderrData = [];
    await runPackageResolve(
      'http://example.org/fhir/StructureDefinition/Unknown',
      {},
    );
    const allOutput = [...stdoutData, ...stderrData].join('\n');
    expect(allOutput).toContain('Not found');
    expect(process.exitCode).toBe(1);
  });

  it('reports not found when no packages loaded', async () => {
    await runPackageResolve(
      'http://mock.test.ig/fhir/StructureDefinition/MockPatient',
      {},
    );
    const allOutput = [...stdoutData, ...stderrData].join('\n');
    expect(allOutput).toContain('Not found');
    expect(process.exitCode).toBe(1);
  });
});
