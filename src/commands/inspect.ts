import { Command } from 'commander';
import { readFhirResource } from '../utils/loader.js';
import {
  printSuccess,
  printHeader,
  printList,
  printJson,
  buildTree,
} from '../utils/printer.js';
import { ExitCode, handleError } from '../utils/errors.js';

interface InspectOptions {
  tree?: boolean;
  json?: boolean;
}

/**
 * Recursively build a nested structure map from a FHIR resource object.
 */
function buildStructureMap(obj: unknown): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return result;
  }

  const record = obj as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    const value = record[key];
    if (Array.isArray(value)) {
      if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
        // Use first element as representative
        result[key] = buildStructureMap(value[0]);
      } else {
        result[key] = {};
      }
    } else if (typeof value === 'object' && value !== null) {
      result[key] = buildStructureMap(value);
    } else {
      result[key] = {};
    }
  }
  return result;
}

/**
 * Get top-level field names and their types from a resource.
 */
function getFieldInfo(resource: unknown): Array<{ name: string; type: string }> {
  if (!resource || typeof resource !== 'object') return [];

  const record = resource as Record<string, unknown>;
  return Object.keys(record).map((key) => {
    const value = record[key];
    if (Array.isArray(value)) {
      if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
        return { name: key, type: 'object[]' };
      }
      return { name: key, type: 'array' };
    }
    if (typeof value === 'object' && value !== null) {
      return { name: key, type: 'object' };
    }
    return { name: key, type: typeof value };
  });
}

/**
 * Execute the inspect logic (exported for testing).
 */
export async function runInspect(
  filePath: string,
  options: InspectOptions,
): Promise<void> {
  const resource = readFhirResource(filePath);
  const resourceType = resource.resourceType;

  if (options.json) {
    const fields = getFieldInfo(resource);
    printJson({
      resourceType,
      fieldCount: fields.length,
      fields,
    });
    process.exitCode = ExitCode.SUCCESS;
    return;
  }

  if (options.tree) {
    const structureMap = buildStructureMap(resource);
    console.log(resourceType);
    const treeLines = buildTree(structureMap);
    for (const line of treeLines) {
      console.log(` ${line}`);
    }
    process.exitCode = ExitCode.SUCCESS;
    return;
  }

  // Default: flat field list
  printSuccess(`Resource: ${resourceType}`);
  printHeader('Fields');
  const fields = getFieldInfo(resource);
  printList(fields.map((f) => f.name));
  process.exitCode = ExitCode.SUCCESS;
}

/**
 * Register the inspect command.
 */
export function registerInspectCommand(program: Command): void {
  program
    .command('inspect <file>')
    .description('Inspect a FHIR resource structure')
    .option('--tree', 'Display as tree structure')
    .option('--json', 'Output in JSON format')
    .action(async (file: string, opts: InspectOptions) => {
      try {
        await runInspect(file, opts);
      } catch (err) {
        handleError(err);
      }
    });
}
