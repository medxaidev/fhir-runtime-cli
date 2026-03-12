import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { extname, dirname } from 'node:path';
import * as yaml from 'js-yaml';
import { fileNotFoundError, fileReadError, parseError } from './errors.js';

/**
 * Supported file formats.
 */
export type FileFormat = 'json' | 'yaml';

/**
 * Detect file format from extension.
 */
export function detectFormat(filePath: string): FileFormat {
  const ext = extname(filePath).toLowerCase();
  if (ext === '.yaml' || ext === '.yml') return 'yaml';
  return 'json';
}

/**
 * Read raw file content as string. Throws CliError on failure.
 */
export function readRawFile(filePath: string): string {
  if (!existsSync(filePath)) {
    throw fileNotFoundError(filePath);
  }
  try {
    return readFileSync(filePath, 'utf-8');
  } catch (err) {
    throw fileReadError(filePath, err instanceof Error ? err : undefined);
  }
}

/**
 * Read and parse a file as a plain JS object (JSON or YAML).
 */
export function readFileAsObject(filePath: string): unknown {
  const content = readRawFile(filePath);
  const format = detectFormat(filePath);

  try {
    if (format === 'yaml') {
      return yaml.load(content);
    }
    return JSON.parse(content);
  } catch (err) {
    const detail = err instanceof Error ? err.message : undefined;
    throw parseError(filePath, detail);
  }
}

/**
 * FHIR resource as a raw JSON object.
 */
export type FhirResourceObject = Record<string, unknown> & { resourceType: string };

/**
 * Read a file and return it as a raw FHIR resource object.
 * Validates that the object has a resourceType field.
 */
export function readFhirResource(filePath: string): FhirResourceObject {
  const obj = readFileAsObject(filePath);

  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    throw parseError(filePath, 'Expected a JSON object');
  }

  const record = obj as Record<string, unknown>;
  if (typeof record.resourceType !== 'string' || record.resourceType.length === 0) {
    throw parseError(filePath, 'Missing or invalid resourceType');
  }

  return record as FhirResourceObject;
}

/**
 * Write content to a file, creating directories as needed.
 */
export function writeOutputFile(filePath: string, content: string): void {
  const dir = dirname(filePath);
  mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, content, 'utf-8');
}
