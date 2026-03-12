import { Command } from 'commander';
import { extractReferencesFromBundle } from 'fhir-runtime';
import { readFhirResource, writeOutputFile } from '../utils/loader.js';
import type { FhirResourceObject } from '../utils/loader.js';
import {
  printSuccess,
  printError,
  printHeader,
  printList,
  printJson,
} from '../utils/printer.js';
import { ExitCode, handleError, inputError } from '../utils/errors.js';

// ─── helpers ────────────────────────────────────────────────────────────────

interface BundleEntry {
  fullUrl?: string;
  resource?: FhirResourceObject;
  request?: { method?: string; url?: string };
}

function assertBundle(resource: FhirResourceObject): void {
  if (resource.resourceType !== 'Bundle') {
    throw inputError(`Expected a Bundle resource, got: ${resource.resourceType}`);
  }
}

function getEntries(resource: FhirResourceObject): BundleEntry[] {
  return (resource.entry as BundleEntry[] | undefined) ?? [];
}

// ─── analyze ────────────────────────────────────────────────────────────────

interface AnalyzeOptions {
  json?: boolean;
  verbose?: boolean;
}

export async function runBundleAnalyze(
  filePath: string,
  options: AnalyzeOptions,
): Promise<void> {
  const resource = readFhirResource(filePath);
  assertBundle(resource);

  const bundleType = (resource.type as string) ?? 'unknown';
  const entries = getEntries(resource);
  const counts = new Map<string, number>();
  const details: Array<{ index: number; resourceType: string; id: string }> = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const res = entry.resource;
    if (!res) continue;
    const rt = res.resourceType ?? 'Unknown';
    const id = (res.id as string) ?? '';
    counts.set(rt, (counts.get(rt) ?? 0) + 1);
    details.push({ index: i + 1, resourceType: rt, id });
  }

  if (options.json) {
    const resourceCounts: Record<string, number> = {};
    for (const [k, v] of counts) resourceCounts[k] = v;
    printJson({
      bundleType,
      totalEntries: entries.length,
      resourceCounts,
      ...(options.verbose ? { entries: details } : {}),
    });
  } else {
    printSuccess(`Bundle Type: ${bundleType}`);
    printSuccess(`Total Entries: ${entries.length}`);
    printHeader('Resources');
    const lines: string[] = [];
    for (const [rt, count] of counts) {
      lines.push(`${rt.padEnd(24)} ${count}`);
    }
    printList(lines);

    if (options.verbose) {
      printHeader('Entries');
      printList(
        details.map(
          (d) => `#${String(d.index).padEnd(4)} ${d.resourceType.padEnd(24)} ${d.id}`,
        ),
      );
    }
  }

  process.exitCode = ExitCode.SUCCESS;
}

// ─── extract ────────────────────────────────────────────────────────────────

interface ExtractOptions {
  type?: string;
  output?: string;
  json?: boolean;
}

export async function runBundleExtract(
  filePath: string,
  options: ExtractOptions,
): Promise<void> {
  const resource = readFhirResource(filePath);
  assertBundle(resource);

  const entries = getEntries(resource);
  const filtered = entries.filter((e) => {
    if (!e.resource) return false;
    if (options.type && e.resource.resourceType !== options.type) return false;
    return true;
  });

  if (filtered.length === 0) {
    printError(
      options.type
        ? `No ${options.type} resources found in Bundle`
        : 'No resources found in Bundle',
    );
    process.exitCode = ExitCode.SUCCESS;
    return;
  }

  if (options.output) {
    let written = 0;
    for (const entry of filtered) {
      const res = entry.resource!;
      const rt = res.resourceType;
      const id = (res.id as string) ?? `unknown-${written}`;
      const outPath = `${options.output}/${rt}-${id}.json`;
      writeOutputFile(outPath, JSON.stringify(res, null, 2));
      written++;
    }
    printSuccess(`Extracted ${written} resource(s) to ${options.output}/`);
  } else if (options.json) {
    printJson(filtered.map((e) => e.resource));
  } else {
    for (const entry of filtered) {
      console.log(JSON.stringify(entry.resource, null, 2));
    }
  }

  process.exitCode = ExitCode.SUCCESS;
}

// ─── refs ───────────────────────────────────────────────────────────────────

interface RefsOptions {
  json?: boolean;
  type?: string;
}

interface ExtractedRef {
  path: string;
  reference: string;
  targetType: string;
  referenceType: string;
  targetId: string;
}

export async function runBundleRefs(
  filePath: string,
  options: RefsOptions,
): Promise<void> {
  const resource = readFhirResource(filePath);
  assertBundle(resource);

  const allRefs = extractReferencesFromBundle(resource) as ExtractedRef[];

  const filtered = options.type
    ? allRefs.filter((r) => r.referenceType === options.type)
    : allRefs;

  // Augment with source resource info from path
  const entries = getEntries(resource);
  const augmented = filtered.map((ref) => {
    const pathParts = ref.path.split('.');
    const sourceType = pathParts[0] ?? '';
    // Find matching entry to get source id
    const sourceEntry = entries.find(
      (e) => e.resource && e.resource.resourceType === sourceType,
    );
    const sourceId = sourceEntry?.resource?.id as string | undefined;
    const sourceResource = sourceId ? `${sourceType}/${sourceId}` : sourceType;
    return { ...ref, sourceResource };
  });

  if (options.json) {
    printJson(augmented);
  } else {
    printSuccess(`Bundle References: ${augmented.length}`);
    if (augmented.length > 0) {
      printHeader('References');
      printList(
        augmented.map(
          (r) =>
            `${r.sourceResource.padEnd(28)} → ${r.reference.padEnd(28)} (${r.referenceType})`,
        ),
      );
    }
  }

  process.exitCode = ExitCode.SUCCESS;
}

// ─── register ───────────────────────────────────────────────────────────────

export function registerBundleCommand(program: Command): void {
  const bundle = program
    .command('bundle')
    .description('Analyze and manipulate FHIR Bundles');

  bundle
    .command('analyze <file>')
    .description('Analyze a FHIR Bundle — resource type counts and distribution')
    .option('--json', 'Output in JSON format')
    .option('--verbose', 'Show each entry with id and resourceType')
    .action(async (file: string, opts: AnalyzeOptions) => {
      try {
        await runBundleAnalyze(file, opts);
      } catch (err) {
        handleError(err);
      }
    });

  bundle
    .command('extract <file>')
    .description('Extract resources from a FHIR Bundle')
    .option('--type <resourceType>', 'Extract only the specified resource type')
    .option('--output <dir>', 'Write extracted resources to directory')
    .option('--json', 'Output as JSON array to stdout')
    .action(async (file: string, opts: ExtractOptions) => {
      try {
        await runBundleExtract(file, opts);
      } catch (err) {
        handleError(err);
      }
    });

  bundle
    .command('refs <file>')
    .description('Extract reference relationships from a FHIR Bundle')
    .option('--json', 'Output in JSON format')
    .option('--type <refType>', 'Filter by reference type (literal/absolute/contained/logical)')
    .action(async (file: string, opts: RefsOptions) => {
      try {
        await runBundleRefs(file, opts);
      } catch (err) {
        handleError(err);
      }
    });
}
