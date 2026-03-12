import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FhirContextImpl,
  MemoryLoader,
  SnapshotGenerator,
  buildCanonicalProfile,
} from 'fhir-runtime';
import type { CanonicalProfile } from 'fhir-runtime';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Resolve the path to the bundled core-definitions directory.
 * In source: src/core-definitions/
 * At runtime (built): dist/esm/core-definitions/ (copied by build)
 */
function getCoreDefsDir(): string {
  // Walk up from src/utils/ → src/ → core-definitions/
  return join(__dirname, '..', 'core-definitions');
}

let _ctx: FhirContextImpl | null = null;
let _preloaded = false;

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
}
