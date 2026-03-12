/**
 * Generate core FHIR R4 StructureDefinition JSON files from the HL7 FHIR specification.
 * Downloads profiles-resources.json and profiles-types.json from hl7.org and extracts
 * individual StructureDefinitions into src/core-definitions/.
 *
 * Usage: node scripts/generate-core-defs.mjs
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ALL_CORE_DEFINITIONS } from 'fhir-runtime';

const FHIR_BASE = 'https://hl7.org/fhir/R4';
const OUT_DIR = join(process.cwd(), 'src', 'core-definitions');
const NEEDED = new Set(ALL_CORE_DEFINITIONS);

async function fetchJson(url) {
  console.log(`Fetching ${url} ...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

function extractFromBundle(bundle, found) {
  if (!bundle?.entry) return;
  for (const entry of bundle.entry) {
    const sd = entry.resource;
    if (sd?.resourceType !== 'StructureDefinition') continue;
    const name = sd.name || sd.id;
    if (NEEDED.has(name) && !found.has(name)) {
      found.set(name, sd);
    }
  }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const found = new Map();

  // Fetch type definitions (primitives + complex types)
  const typesBundle = await fetchJson(`${FHIR_BASE}/profiles-types.json`);
  extractFromBundle(typesBundle, found);
  console.log(`After profiles-types.json: ${found.size}/${NEEDED.size} definitions found`);

  // Fetch resource definitions
  const resourcesBundle = await fetchJson(`${FHIR_BASE}/profiles-resources.json`);
  extractFromBundle(resourcesBundle, found);
  console.log(`After profiles-resources.json: ${found.size}/${NEEDED.size} definitions found`);

  // Write individual files
  let written = 0;
  for (const name of NEEDED) {
    const sd = found.get(name);
    if (!sd) {
      console.warn(`⚠ Missing: ${name}`);
      continue;
    }
    const filePath = join(OUT_DIR, `${name}.json`);
    writeFileSync(filePath, JSON.stringify(sd, null, 2), 'utf-8');
    written++;
  }

  // Write an index file
  const missing = [...NEEDED].filter(n => !found.has(n));
  console.log(`\n✔ Written ${written} definitions to ${OUT_DIR}`);
  if (missing.length > 0) {
    console.log(`⚠ Missing ${missing.length}: ${missing.join(', ')}`);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
