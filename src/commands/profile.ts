import { Command } from 'commander';
import {
  buildCanonicalProfile,
  SnapshotGenerator,
} from 'fhir-runtime';
import { readFhirResource, writeOutputFile } from '../utils/loader.js';
import type { FhirResourceObject } from '../utils/loader.js';
import { ensureCoreDefinitions } from '../utils/context.js';
import {
  printSuccess,
  printError,
  printHeader,
  printList,
  printJson,
  printInfo,
} from '../utils/printer.js';
import { ExitCode, handleError, inputError } from '../utils/errors.js';

// ─── helpers ────────────────────────────────────────────────────────────────

function assertStructureDefinition(resource: FhirResourceObject): void {
  if (resource.resourceType !== 'StructureDefinition') {
    throw inputError(
      `Expected a StructureDefinition resource, got: ${resource.resourceType}`,
    );
  }
}

function isUrl(input: string): boolean {
  return input.startsWith('http://') || input.startsWith('https://');
}

interface CanonicalElement {
  path: string;
  id?: string;
  min: number;
  max: number | string;
  types?: Array<{ code: string }>;
  binding?: {
    strength: string;
    valueSetUrl?: string;
    description?: string;
  };
  mustSupport?: boolean;
  isModifier?: boolean;
  isSummary?: boolean;
  constraints?: Array<{ key: string; severity: string; human: string }>;
}

// ─── profile show ───────────────────────────────────────────────────────────

interface ShowOptions {
  fields?: boolean;
  full?: boolean;
  json?: boolean;
}

export async function runProfileShow(
  urlOrFile: string,
  options: ShowOptions,
): Promise<void> {
  const ctx = await ensureCoreDefinitions();
  let sd: Record<string, unknown> | null = null;

  if (isUrl(urlOrFile)) {
    sd = (await ctx.loadStructureDefinition(urlOrFile)) as unknown as Record<string, unknown> | null;
    if (!sd) {
      throw inputError(`StructureDefinition not found: ${urlOrFile}`);
    }
  } else {
    const resource = readFhirResource(urlOrFile);
    assertStructureDefinition(resource);
    sd = resource;
  }

  const name = (sd.name as string) ?? 'Unknown';
  const url = (sd.url as string) ?? '';
  const kind = (sd.kind as string) ?? '';
  const abstract_ = sd.abstract as boolean | undefined;
  const baseDefinition = (sd.baseDefinition as string) ?? '';
  const version = (sd.version as string) ?? '';
  const status = (sd.status as string) ?? '';

  // If the SD has no snapshot, generate one first
  const snapshot = sd.snapshot as Record<string, unknown> | undefined;
  let sdForCanonical = sd;
  if (!snapshot || !(snapshot.element as unknown[])?.length) {
    const generator = new SnapshotGenerator(ctx, { generateCanonical: false });
    const snapResult = await generator.generate(sd as never);
    if (snapResult.success) {
      sdForCanonical = snapResult.structureDefinition as unknown as Record<string, unknown>;
    }
  }

  const canonical = buildCanonicalProfile(sdForCanonical as never);
  const elements: CanonicalElement[] = canonical.elements
    ? [...(canonical.elements as Map<string, CanonicalElement>).values()]
    : [];

  if (options.json) {
    printJson({
      url,
      name,
      kind,
      abstract: abstract_ ?? false,
      baseDefinition,
      version,
      status,
      elementCount: elements.length,
      elements: elements.map((el) => ({
        path: el.path,
        min: el.min,
        max: el.max,
        types: el.types?.map((t) => t.code) ?? [],
        binding: el.binding
          ? { strength: el.binding.strength, valueSet: el.binding.valueSetUrl }
          : undefined,
        mustSupport: el.mustSupport ?? false,
      })),
    });
    process.exitCode = ExitCode.SUCCESS;
    return;
  }

  // Text output
  printInfo('Profile:', `${name} (${url})`);
  printInfo('Kind:   ', kind);
  if (baseDefinition) {
    printInfo('Base:   ', baseDefinition);
  }

  if (options.full) {
    if (version) printInfo('Version:', version);
    if (status) printInfo('Status: ', status);
    printInfo('Abstract:', String(abstract_ ?? false));
  }

  // Group elements by required vs optional
  const required = elements.filter((el) => el.min > 0 && el.path.split('.').length === 2);
  const optional = elements.filter((el) => el.min === 0 && el.path.split('.').length === 2);

  if (required.length > 0) {
    printHeader('REQUIRED');
    printList(
      required.map((el) => {
        const shortPath = el.path.split('.').pop() ?? el.path;
        const typeStr = el.types?.map((t) => t.code).join('|') ?? '';
        const maxStr = el.max === 'unbounded' ? '[]' : '';
        const bindingStr = el.binding
          ? ` (binding: ${el.binding.strength})`
          : '';
        return `${shortPath.padEnd(20)} ${typeStr}${maxStr}${bindingStr}`;
      }),
    );
  }

  if (optional.length > 0) {
    printHeader('OPTIONAL');
    printList(
      optional.map((el) => {
        const shortPath = el.path.split('.').pop() ?? el.path;
        const typeStr = el.types?.map((t) => t.code).join('|') ?? '';
        const maxStr = el.max === 'unbounded' ? '[]' : '';
        const bindingStr = el.binding
          ? ` (binding: ${el.binding.strength})`
          : '';
        return `${shortPath.padEnd(20)} ${typeStr}${maxStr}${bindingStr}`;
      }),
    );
  }

  process.exitCode = ExitCode.SUCCESS;
}

// ─── profile snapshot ───────────────────────────────────────────────────────

interface SnapshotOptions {
  output?: string;
  pretty?: boolean;
  canonical?: boolean;
}

export async function runProfileSnapshot(
  filePath: string,
  options: SnapshotOptions,
): Promise<void> {
  const resource = readFhirResource(filePath);
  assertStructureDefinition(resource);

  const ctx = await ensureCoreDefinitions();
  const generator = new SnapshotGenerator(ctx, { generateCanonical: !!options.canonical });

  const result = await generator.generate(resource as never);

  if (!result.success) {
    const issues = result.issues ?? [];
    printError('Snapshot generation failed');
    if (issues.length > 0) {
      printList(issues.map((i: { message: string }) => i.message));
    }
    process.exitCode = ExitCode.VALIDATION_FAILURE;
    return;
  }

  const outputSd = result.structureDefinition as unknown as Record<string, unknown>;
  const name = (outputSd.name as string) ?? 'Unknown';
  const url = (outputSd.url as string) ?? '';
  const snapshotElements = (
    (outputSd.snapshot as Record<string, unknown>)?.element as unknown[]
  )?.length ?? 0;

  const indent = options.pretty !== false ? 2 : 0;
  const jsonOutput = JSON.stringify(outputSd, null, indent);

  if (options.output) {
    writeOutputFile(options.output, jsonOutput);
    printSuccess('Snapshot generated');
    printInfo('Profile: ', name);
    printInfo('URL:     ', url);
    printInfo('Elements:', String(snapshotElements));
    printInfo('Output:  ', options.output);
  } else {
    console.log(jsonOutput);
  }

  if (options.canonical && result.canonical) {
    printHeader('Canonical Profile');
    console.log(JSON.stringify(result.canonical, null, 2));
  }

  process.exitCode = ExitCode.SUCCESS;
}

// ─── profile validate ───────────────────────────────────────────────────────

interface ProfileValidateOptions {
  json?: boolean;
}

export async function runProfileValidate(
  filePath: string,
  options: ProfileValidateOptions,
): Promise<void> {
  const resource = readFhirResource(filePath);
  assertStructureDefinition(resource);

  const issues: Array<{ severity: string; message: string }> = [];

  // Check required fields
  const requiredFields = ['url', 'name', 'kind', 'type', 'status'];
  for (const field of requiredFields) {
    if (!resource[field]) {
      issues.push({
        severity: 'error',
        message: `Missing required field: ${field}`,
      });
    }
  }

  // Check abstract field
  if (resource.abstract === undefined) {
    issues.push({
      severity: 'warning',
      message: 'Field "abstract" is not set (defaults to false)',
    });
  }

  // Check baseDefinition for constraint profiles
  if (resource.derivation === 'constraint' && !resource.baseDefinition) {
    issues.push({
      severity: 'error',
      message: 'Constraint profiles must have a baseDefinition',
    });
  }

  // Check differential exists
  if (!resource.differential) {
    issues.push({
      severity: 'warning',
      message: 'No differential defined',
    });
  }

  // Try snapshot generation to check structural validity
  if (issues.filter((i) => i.severity === 'error').length === 0) {
    try {
      const ctx = await ensureCoreDefinitions();
      const generator = new SnapshotGenerator(ctx, { generateCanonical: false });
      const result = await generator.generate(resource as never);
      if (!result.success) {
        const genIssues = result.issues ?? [];
        for (const gi of genIssues) {
          issues.push({
            severity: 'error',
            message: `Snapshot generation: ${(gi as { message: string }).message}`,
          });
        }
      }
    } catch (err) {
      issues.push({
        severity: 'error',
        message: `Snapshot generation failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const isValid = errors.length === 0;

  if (options.json) {
    printJson({
      valid: isValid,
      name: (resource.name as string) ?? '',
      url: (resource.url as string) ?? '',
      errors: errors.length,
      warnings: warnings.length,
      issues,
    });
  } else if (isValid) {
    printSuccess(`StructureDefinition: ${(resource.name as string) ?? ''}`);
    printSuccess('Profile validation passed');
    if (warnings.length > 0) {
      printHeader(`Warnings (${warnings.length})`);
      printList(warnings.map((w) => `warning: ${w.message}`));
    }
  } else {
    printError(
      `Profile validation failed (${errors.length} error(s), ${warnings.length} warning(s))`,
    );
    printHeader('Issues');
    printList(
      issues.map((i) => `${i.severity}: ${i.message}`),
    );
  }

  process.exitCode = isValid ? ExitCode.SUCCESS : ExitCode.VALIDATION_FAILURE;
}

// ─── register ───────────────────────────────────────────────────────────────

export function registerProfileCommand(program: Command): void {
  const profile = program
    .command('profile')
    .description('View and manipulate FHIR StructureDefinition profiles');

  profile
    .command('show <url-or-file>')
    .description('Show profile constraints and metadata')
    .option('--fields', 'Show field constraints (default)')
    .option('--full', 'Show full metadata')
    .option('--json', 'Output in JSON format')
    .action(async (urlOrFile: string, opts: ShowOptions) => {
      try {
        await runProfileShow(urlOrFile, opts);
      } catch (err) {
        handleError(err);
      }
    });

  profile
    .command('snapshot <file>')
    .description('Generate a snapshot for a StructureDefinition')
    .option('--output <file>', 'Write output to file')
    .option('--pretty', 'Pretty-print JSON (default: true)')
    .option('--canonical', 'Also output CanonicalProfile representation')
    .action(async (file: string, opts: SnapshotOptions) => {
      try {
        await runProfileSnapshot(file, opts);
      } catch (err) {
        handleError(err);
      }
    });

  profile
    .command('validate <file>')
    .description('Validate a StructureDefinition file')
    .option('--json', 'Output in JSON format')
    .action(async (file: string, opts: ProfileValidateOptions) => {
      try {
        await runProfileValidate(file, opts);
      } catch (err) {
        handleError(err);
      }
    });
}
