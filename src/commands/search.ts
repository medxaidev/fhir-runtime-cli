import { Command } from 'commander';
import {
  parseSearchParameter,
  extractSearchValues,
  buildCapabilityFragment,
} from 'fhir-runtime';
import { readFhirResource } from '../utils/loader.js';
import type { FhirResourceObject } from '../utils/loader.js';
import {
  printSuccess,
  printError,
  printHeader,
  printList,
  printJson,
  printInfo,
} from '../utils/printer.js';
import { ExitCode, handleError, inputError } from '../utils/errors.js';

// ─── search extract ─────────────────────────────────────────────────────────

interface ExtractOptions {
  param?: string;
  json?: boolean;
}

export async function runSearchExtract(
  resourceFile: string,
  searchParamFile: string,
  options: ExtractOptions,
): Promise<void> {
  const resource = readFhirResource(resourceFile);
  const spRaw = readFhirResource(searchParamFile);

  // Parse search parameter(s)
  let searchParams: Array<{ code: string; type: string; expression: string; base: string[] }> = [];

  if (spRaw.resourceType === 'Bundle') {
    // Bundle of SearchParameters
    const entries = (spRaw.entry as Array<{ resource?: FhirResourceObject }>) ?? [];
    for (const entry of entries) {
      if (entry.resource?.resourceType === 'SearchParameter') {
        const parsed = parseSearchParameter(entry.resource as never);
        if (parsed.success) {
          searchParams.push(parsed.data as never);
        }
      }
    }
  } else if (spRaw.resourceType === 'SearchParameter') {
    const parsed = parseSearchParameter(spRaw as never);
    if (parsed.success) {
      searchParams.push(parsed.data as never);
    } else {
      printError('Failed to parse SearchParameter');
      process.exitCode = ExitCode.VALIDATION_FAILURE;
      return;
    }
  } else {
    throw inputError(`Expected SearchParameter or Bundle, got: ${spRaw.resourceType}`);
  }

  // Filter by --param if specified
  if (options.param) {
    searchParams = searchParams.filter((sp) => sp.code === options.param);
  }

  const resourceType = resource.resourceType;
  const id = (resource.id as string) ?? '';

  // Extract search values for each parameter
  const results: Array<{ code: string; type: string; values: unknown[] }> = [];
  for (const sp of searchParams) {
    try {
      const values = extractSearchValues(resource as never, sp as never);
      results.push({ code: sp.code, type: sp.type, values: values as unknown as unknown[] });
    } catch {
      results.push({ code: sp.code, type: sp.type, values: [] });
    }
  }

  if (options.json) {
    printJson(results);
  } else {
    printSuccess(`Search Index Values for: ${resourceType}/${id}`);
    if (results.length === 0) {
      printInfo('', 'No search values extracted');
    } else {
      printHeader('Values');
      printList(
        results.map((r) => {
          const valStr = r.values.length > 0
            ? JSON.stringify(r.values)
            : '(none)';
          return `${r.code.padEnd(16)} (${r.type.padEnd(8)}) ${valStr}`;
        }),
      );
    }
  }

  process.exitCode = ExitCode.SUCCESS;
}

// ─── search validate ────────────────────────────────────────────────────────

interface ValidateOptions {
  json?: boolean;
}

export async function runSearchValidate(
  spFile: string,
  options: ValidateOptions,
): Promise<void> {
  const spRaw = readFhirResource(spFile);

  if (spRaw.resourceType !== 'SearchParameter') {
    throw inputError(`Expected SearchParameter, got: ${spRaw.resourceType}`);
  }

  const parsed = parseSearchParameter(spRaw as never);

  if (parsed.success) {
    const sp = parsed.data as unknown as { code: string; type: string; base: string[]; expression: string };

    if (options.json) {
      printJson({
        valid: true,
        code: sp.code,
        type: sp.type,
        base: sp.base,
        expression: sp.expression,
      });
    } else {
      printSuccess('SearchParameter valid');
      printInfo('Code:  ', sp.code);
      printInfo('Type:  ', sp.type);
      printInfo('Base:  ', sp.base.join(', '));
      printInfo('Expr:  ', sp.expression);
    }
    process.exitCode = ExitCode.SUCCESS;
  } else {
    const issues = parsed.issues ?? [];

    if (options.json) {
      printJson({
        valid: false,
        issues: issues.map((i: { message: string }) => i.message),
      });
    } else {
      printError('SearchParameter invalid');
      if (issues.length > 0) {
        printHeader('Issues');
        printList(issues.map((i: { message: string }) => i.message));
      }
    }
    process.exitCode = ExitCode.VALIDATION_FAILURE;
  }
}

// ─── search capability ──────────────────────────────────────────────────────

interface CapabilityOptions {
  searchParams?: string;
  mode?: string;
  output?: string;
  pretty?: boolean;
}

export async function runSearchCapability(
  profileFiles: string[],
  options: CapabilityOptions,
): Promise<void> {
  if (profileFiles.length === 0) {
    throw inputError('At least one profile file is required');
  }

  // Read profile SDs
  const profiles: FhirResourceObject[] = [];
  for (const file of profileFiles) {
    const resource = readFhirResource(file);
    if (resource.resourceType !== 'StructureDefinition') {
      throw inputError(`Expected StructureDefinition, got: ${resource.resourceType} in ${file}`);
    }
    profiles.push(resource);
  }

  // Read search params if provided
  let searchParams: unknown[] = [];
  if (options.searchParams) {
    const spRaw = readFhirResource(options.searchParams);
    if (spRaw.resourceType === 'Bundle') {
      const entries = (spRaw.entry as Array<{ resource?: FhirResourceObject }>) ?? [];
      for (const entry of entries) {
        if (entry.resource?.resourceType === 'SearchParameter') {
          const parsed = parseSearchParameter(entry.resource as never);
          if (parsed.success) {
            searchParams.push(parsed.data);
          }
        }
      }
    } else if (spRaw.resourceType === 'SearchParameter') {
      const parsed = parseSearchParameter(spRaw as never);
      if (parsed.success) {
        searchParams.push(parsed.data);
      }
    }
  }

  const mode = (options.mode ?? 'server') as 'server' | 'client';

  const fragment = buildCapabilityFragment(
    profiles as never[],
    searchParams as never[],
    mode,
  );

  const indent = options.pretty !== false ? 2 : 0;
  const jsonOutput = JSON.stringify(fragment, null, indent);

  if (options.output) {
    const { writeOutputFile } = await import('../utils/loader.js');
    writeOutputFile(options.output, jsonOutput + '\n');
    printSuccess(`CapabilityStatement fragment written to ${options.output}`);
  } else {
    console.log(jsonOutput);
  }

  process.exitCode = ExitCode.SUCCESS;
}

// ─── register ───────────────────────────────────────────────────────────────

export function registerSearchCommand(program: Command): void {
  const search = program
    .command('search')
    .description('FHIR SearchParameter tools');

  search
    .command('extract <resource-file> <search-params-file>')
    .description('Extract search index values from a FHIR resource')
    .option('--param <code>', 'Only extract the specified parameter code')
    .option('--json', 'Output in JSON format')
    .action(async (resourceFile: string, spFile: string, opts: ExtractOptions) => {
      try {
        await runSearchExtract(resourceFile, spFile, opts);
      } catch (err) {
        handleError(err);
      }
    });

  search
    .command('validate <file>')
    .description('Validate a SearchParameter definition')
    .option('--json', 'Output in JSON format')
    .action(async (file: string, opts: ValidateOptions) => {
      try {
        await runSearchValidate(file, opts);
      } catch (err) {
        handleError(err);
      }
    });

  search
    .command('capability <profile-files...>')
    .description('Generate a CapabilityStatement REST fragment from profiles')
    .option('--search-params <file>', 'SearchParameter Bundle to associate')
    .option('--mode <mode>', 'REST mode: server or client (default: server)')
    .option('--output <file>', 'Write output to file')
    .option('--pretty', 'Pretty-print JSON (default: true)')
    .action(async (profileFiles: string[], opts: CapabilityOptions) => {
      try {
        await runSearchCapability(profileFiles, opts);
      } catch (err) {
        handleError(err);
      }
    });
}
