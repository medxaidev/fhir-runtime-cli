import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import {
  detectFormat,
  readRawFile,
  readFileAsObject,
  readFhirResource,
} from '../loader.js';
import { CliError, ExitCode } from '../errors.js';

const FIXTURES = resolve(process.cwd(), 'fixtures');

describe('detectFormat', () => {
  it('detects JSON from .json extension', () => {
    expect(detectFormat('patient.json')).toBe('json');
  });

  it('detects YAML from .yaml extension', () => {
    expect(detectFormat('patient.yaml')).toBe('yaml');
  });

  it('detects YAML from .yml extension', () => {
    expect(detectFormat('patient.yml')).toBe('yaml');
  });

  it('defaults to JSON for unknown extensions', () => {
    expect(detectFormat('patient.txt')).toBe('json');
  });

  it('handles uppercase extensions as JSON default', () => {
    expect(detectFormat('patient.XML')).toBe('json');
  });
});

describe('readRawFile', () => {
  it('reads an existing file', () => {
    const content = readRawFile(resolve(FIXTURES, 'patient-valid.json'));
    expect(content).toContain('"resourceType"');
    expect(content).toContain('"Patient"');
  });

  it('throws CliError for non-existent file', () => {
    expect(() => readRawFile(resolve(FIXTURES, 'does-not-exist.json'))).toThrow(CliError);
    try {
      readRawFile(resolve(FIXTURES, 'does-not-exist.json'));
    } catch (err) {
      expect((err as CliError).exitCode).toBe(ExitCode.FILE_ERROR);
    }
  });
});

describe('readFileAsObject', () => {
  it('parses a valid JSON file', () => {
    const obj = readFileAsObject(resolve(FIXTURES, 'patient-valid.json'));
    expect(obj).toHaveProperty('resourceType', 'Patient');
  });

  it('parses a valid YAML file', () => {
    const obj = readFileAsObject(resolve(FIXTURES, 'patient-valid.yaml'));
    expect(obj).toHaveProperty('resourceType', 'Patient');
  });

  it('throws CliError for invalid JSON', () => {
    expect(() => readFileAsObject(resolve(FIXTURES, 'invalid-json.json'))).toThrow(CliError);
    try {
      readFileAsObject(resolve(FIXTURES, 'invalid-json.json'));
    } catch (err) {
      expect((err as CliError).exitCode).toBe(ExitCode.FILE_ERROR);
    }
  });
});

describe('readFhirResource', () => {
  it('parses a valid Patient resource', () => {
    const resource = readFhirResource(resolve(FIXTURES, 'patient-valid.json'));
    expect(resource).toHaveProperty('resourceType', 'Patient');
    expect(resource).toHaveProperty('id', 'patient-1');
  });

  it('parses a valid Observation resource', () => {
    const resource = readFhirResource(resolve(FIXTURES, 'observation-valid.json'));
    expect(resource).toHaveProperty('resourceType', 'Observation');
  });

  it('parses a YAML file as FHIR resource', () => {
    const resource = readFhirResource(resolve(FIXTURES, 'patient-valid.yaml'));
    expect(resource).toHaveProperty('resourceType', 'Patient');
    expect(resource).toHaveProperty('id', 'patient-yaml');
  });

  it('throws CliError for non-existent file', () => {
    expect(() => readFhirResource(resolve(FIXTURES, 'nope.json'))).toThrow(CliError);
  });

  it('throws CliError for invalid JSON file', () => {
    expect(() => readFhirResource(resolve(FIXTURES, 'invalid-json.json'))).toThrow(CliError);
  });

  it('throws CliError for missing resourceType', () => {
    expect(() => readFhirResource(resolve(FIXTURES, 'no-resource-type.json'))).toThrow(CliError);
  });

  it('preserves all raw JSON fields', () => {
    const resource = readFhirResource(resolve(FIXTURES, 'patient-valid.json'));
    expect(resource).toHaveProperty('name');
    expect(resource).toHaveProperty('gender', 'male');
    expect(resource).toHaveProperty('birthDate', '1990-05-15');
    expect(resource).toHaveProperty('address');
  });
});
