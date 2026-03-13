import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FhirContextImpl,
  MemoryLoader,
  SnapshotGenerator,
  buildCanonicalProfile,
  createRuntime,
} from 'fhir-runtime';
import type { CanonicalProfile, FhirRuntimeInstance } from 'fhir-runtime';

// Get __dirname compatible with both ESM and CJS
function getDirname(): string {
  // In ESM: use import.meta.url
  if (typeof import.meta !== 'undefined' && import.meta.url) {
    return dirname(fileURLToPath(import.meta.url));
  }
  // In CJS: __dirname is available as a global
  // TypeScript will compile this, and at runtime in CJS, __dirname will be defined
  return typeof __dirname !== 'undefined' ? __dirname : process.cwd();
}

const currentDir = getDirname();

/**
 * Resolve the path to the bundled core-definitions directory.
 * In development: src/core-definitions/ (from src/utils/ go up to src/)
 * In production (built): dist/esm/core-definitions/ or dist/cjs/core-definitions/
 * After global install: /path/to/npm/global/node_modules/fhir-runtime-cli/dist/esm/core-definitions/
 */
function getCoreDefsDir(): string {
  // In development: currentDir = src/utils/, need to go up to src/
  // In production: currentDir = dist/esm/ or dist/cjs/, core-definitions is at same level
  const devPath = join(currentDir, '..', 'core-definitions');
  const prodPath = join(currentDir, 'core-definitions');

  // Check if we're in development (src/utils/) or production (dist/esm/ or dist/cjs/)
  // In dev, currentDir ends with 'src/utils' or 'src\\utils'
  // In prod, currentDir ends with 'dist/esm' or 'dist/cjs' or 'dist\\esm' or 'dist\\cjs'
  if (currentDir.includes('src')) {
    return devPath;
  }
  return prodPath;
}

let _ctx: FhirContextImpl | null = null;
let _preloaded = false;
let _runtime: FhirRuntimeInstance | null = null;

/**
 * Get or create the shared FhirContext instance.
 */
export function getContext(): FhirContextImpl {
  if (!_ctx) {
    _ctx = new FhirContextImpl({
      loaders: [new MemoryLoader(new Map())],
      specDirectory: getCoreDefsDir(),
    });
  }
  return _ctx;
}

/**
 * Ensure core R4 definitions are preloaded (73 base SDs).
 */
export async function ensureCoreDefinitions(): Promise<FhirContextImpl> {
  const ctx = getContext();
  if (!_preloaded) {
    await ctx.preloadCoreDefinitions();
    _preloaded = true;
  }
  return ctx;
}

/**
 * Get or create the shared FhirRuntimeInstance (v0.8.0+).
 * Uses createRuntime() with the pre-configured FhirContext.
 */
export async function getRuntime(): Promise<FhirRuntimeInstance> {
  if (!_runtime) {
    const ctx = await ensureCoreDefinitions();
    _runtime = await createRuntime({ context: ctx, preloadCore: false });
  }
  return _runtime;
}

/**
 * Build a CanonicalProfile for a given resource type.
 * Loads the base StructureDefinition from context and generates a snapshot if needed.
 */
export async function getCanonicalProfileForType(
  resourceType: string,
): Promise<CanonicalProfile> {
  const ctx = await ensureCoreDefinitions();
  const url = `http://hl7.org/fhir/StructureDefinition/${resourceType}`;
  const sd = await ctx.loadStructureDefinition(url);

  if (!sd) {
    throw new Error(`StructureDefinition not found for: ${resourceType}`);
  }

  // If snapshot already exists, build canonical directly
  if (sd.snapshot && sd.snapshot.element && sd.snapshot.element.length > 0) {
    return buildCanonicalProfile(sd);
  }

  // Otherwise generate snapshot
  const generator = new SnapshotGenerator(ctx, { generateCanonical: true });
  const result = await generator.generate(sd);

  if (!result.success) {
    throw new Error(`Failed to generate snapshot for ${resourceType}`);
  }

  if (result.canonical) {
    return result.canonical;
  }

  return buildCanonicalProfile(result.structureDefinition);
}

/**
 * Reset the context (for testing).
 */
export function resetContext(): void {
  _ctx = null;
  _preloaded = false;
  _runtime = null;
}
