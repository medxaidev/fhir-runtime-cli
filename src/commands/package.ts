import { Command } from 'commander';
import { NpmPackageLoader, PackageManager } from 'fhir-runtime';
import {
  printSuccess,
  printError,
  printHeader,
  printList,
  printJson,
  printInfo,
} from '../utils/printer.js';
import { ExitCode, handleError, fileNotFoundError } from '../utils/errors.js';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// ─── shared state ───────────────────────────────────────────────────────────

let _packageManager: PackageManager | null = null;

export function getPackageManager(): PackageManager {
  if (!_packageManager) {
    _packageManager = new PackageManager();
  }
  return _packageManager;
}

export function resetPackageManager(): void {
  _packageManager = null;
}

// ─── types ──────────────────────────────────────────────────────────────────

interface PackageInfo {
  name: string;
  version: string;
  path: string;
  manifest: {
    name?: string;
    version?: string;
    fhirVersions?: string[];
    type?: string;
    description?: string;
  };
  resourceCount: number;
}

interface PackageEntry {
  filename: string;
  resourceType: string;
  id?: string;
  url?: string;
  version?: string;
  kind?: string;
  type?: string;
}

interface CanonicalResolution {
  url: string;
  packageName: string;
  packageVersion: string;
  resourceType: string;
  filename: string;
}

// ─── package load ───────────────────────────────────────────────────────────

interface LoadOptions {
  json?: boolean;
}

export async function runPackageLoad(
  pkgPath: string,
  options: LoadOptions,
): Promise<void> {
  if (!existsSync(pkgPath)) {
    throw fileNotFoundError(pkgPath);
  }

  const pm = getPackageManager();
  pm.registerPackage(pkgPath);

  // Read info via NpmPackageLoader for display
  const loader = new NpmPackageLoader(pkgPath);
  const manifest = loader.getManifest() as PackageInfo['manifest'] | undefined;
  const entries = (loader.getEntries() ?? []) as PackageEntry[];
  const sds = (loader.getEntriesByType('StructureDefinition') ?? []) as PackageEntry[];
  const extensions = sds.filter((sd) => sd.type === 'Extension');
  const profiles = sds.filter((sd) => sd.type !== 'Extension');

  const name = manifest?.name ?? 'unknown';
  const version = manifest?.version ?? '';

  if (options.json) {
    printJson({
      name,
      version,
      fhirVersions: manifest?.fhirVersions ?? [],
      totalResources: entries.length,
      profiles: profiles.length,
      extensions: extensions.length,
    });
  } else {
    printSuccess('Package loaded');
    printInfo('Name:      ', name);
    printInfo('Version:   ', version);
    printInfo('FHIR:      ', (manifest?.fhirVersions ?? []).join(', '));
    printInfo('Profiles:  ', String(profiles.length));
    printInfo('Extensions:', String(extensions.length));
    printInfo('Total:     ', String(entries.length));
  }

  process.exitCode = ExitCode.SUCCESS;
}

// ─── package list ───────────────────────────────────────────────────────────

interface ListOptions {
  json?: boolean;
  verbose?: boolean;
}

export async function runPackageList(
  options: ListOptions,
): Promise<void> {
  const pm = getPackageManager();
  const packages = pm.getPackages() as unknown as PackageInfo[];

  if (options.json) {
    const result = packages.map((pkg) => {
      const loader = new NpmPackageLoader(pkg.path);
      const sds = (loader.getEntriesByType('StructureDefinition') ?? []) as PackageEntry[];
      return {
        name: pkg.name,
        version: pkg.version,
        profiles: sds.length,
        totalResources: pkg.resourceCount,
        ...(options.verbose
          ? { urls: sds.map((sd) => sd.url).filter(Boolean) }
          : {}),
      };
    });
    printJson({
      count: packages.length,
      packages: result,
    });
  } else {
    printSuccess(`Loaded Packages: ${packages.length}`);
    if (packages.length === 0) {
      printInfo('', 'No packages loaded. Use: fhir package load <path>');
    } else {
      printHeader('Packages');
      const lines: string[] = [];
      for (const pkg of packages) {
        lines.push(
          `${pkg.name.padEnd(30)} ${(pkg.version ?? '').padEnd(10)} ${pkg.resourceCount} resources`,
        );
      }
      printList(lines);

      if (options.verbose) {
        for (const pkg of packages) {
          const loader = new NpmPackageLoader(pkg.path);
          const sds = (loader.getEntriesByType('StructureDefinition') ?? []) as PackageEntry[];
          if (sds.length > 0) {
            printHeader(`${pkg.name} ${pkg.version}`);
            printList(sds.map((sd) => sd.url ?? sd.filename));
          }
        }
      }
    }
  }

  process.exitCode = ExitCode.SUCCESS;
}

// ─── package resolve ────────────────────────────────────────────────────────

interface ResolveOptions {
  json?: boolean;
  show?: boolean;
}

export async function runPackageResolve(
  url: string,
  options: ResolveOptions,
): Promise<void> {
  const pm = getPackageManager();
  const result = pm.resolveCanonical(url) as unknown as CanonicalResolution | undefined;

  if (!result) {
    printError(`Not found: ${url}`);
    printInfo('', 'No loaded package contains this canonical URL.');
    printInfo('', 'Try: fhir package load <path>');
    process.exitCode = ExitCode.VALIDATION_FAILURE;
    return;
  }

  // Load the actual resource content if --show or for metadata
  let resource: Record<string, unknown> | null = null;
  const pkg = (pm.getPackages() as unknown as PackageInfo[]).find(
    (p) => p.name === result.packageName,
  );
  if (pkg) {
    try {
      const filePath = join(pkg.path, result.filename);
      const content = readFileSync(filePath, 'utf-8');
      resource = JSON.parse(content) as Record<string, unknown>;
    } catch {
      // Resource file not readable
    }
  }

  const resourceType = result.resourceType ?? '';
  const kind = (resource?.kind as string) ?? '';
  const baseDefinition = (resource?.baseDefinition as string) ?? '';

  if (options.json) {
    printJson({
      url,
      package: result.packageName,
      version: result.packageVersion,
      resourceType,
      kind: kind || undefined,
      baseDefinition: baseDefinition || undefined,
      ...(options.show && resource ? { resource } : {}),
    });
  } else {
    printSuccess(`Resolved: ${url}`);
    printInfo('Package:  ', `${result.packageName} ${result.packageVersion}`);
    printInfo('Type:     ', resourceType);
    if (kind) printInfo('Kind:     ', kind);
    if (baseDefinition) printInfo('Base:     ', baseDefinition);

    if (options.show && resource) {
      printHeader('Resource');
      console.log(JSON.stringify(resource, null, 2));
    }
  }

  process.exitCode = ExitCode.SUCCESS;
}

// ─── register ───────────────────────────────────────────────────────────────

export function registerPackageCommand(program: Command): void {
  const pkg = program
    .command('package')
    .description('Manage FHIR IG packages');

  pkg
    .command('load <path>')
    .description('Load a FHIR IG package (.tgz or directory)')
    .option('--json', 'Output in JSON format')
    .action(async (path: string, opts: LoadOptions) => {
      try {
        await runPackageLoad(path, opts);
      } catch (err) {
        handleError(err);
      }
    });

  pkg
    .command('list')
    .description('List loaded FHIR IG packages')
    .option('--json', 'Output in JSON format')
    .option('--verbose', 'Show profile URLs for each package')
    .action(async (opts: ListOptions) => {
      try {
        await runPackageList(opts);
      } catch (err) {
        handleError(err);
      }
    });

  pkg
    .command('resolve <url>')
    .description('Resolve a canonical URL to a StructureDefinition')
    .option('--json', 'Output in JSON format')
    .option('--show', 'Show the full StructureDefinition content')
    .action(async (url: string, opts: ResolveOptions) => {
      try {
        await runPackageResolve(url, opts);
      } catch (err) {
        handleError(err);
      }
    });
}
