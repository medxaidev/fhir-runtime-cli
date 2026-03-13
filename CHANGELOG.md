# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.2.1] - 2026-03-13

### Fixed

- **Critical**: Fixed `core-definitions` path resolution for global npm installations
- Build script now copies `core-definitions/` to `dist/esm/` and `dist/cjs/`
- `context.ts` now correctly resolves paths in both development and production environments
- Eliminated "ENOENT: no such file or directory" error when running globally installed CLI

### Infrastructure

- Updated build script to include `copyCoreDefinitions()` function
- Added ESM/CJS compatible `__dirname` resolution using `getDirname()` helper
- All 123 tests passing in both development and production builds

---

## [0.2.0] - 2026-03-12

### Changed

- Upgraded `fhir-runtime` from v0.7.2 to v0.8.0
- Added `fhir-definition@0.4.0` as dependency
- Refactored `validate` command to use `runtime.validate()` via `createRuntime()` API
- Added `getRuntime()` to context utility — returns unified `FhirRuntimeInstance`
- Simplified validation pipeline: no longer manually creates `StructureValidator` + `CanonicalProfile`

### Infrastructure

- Full backward compatibility — all existing commands work without changes
- All 123 tests passing

---

## [0.1.0] - 2026-03-12

### Added

**Core Commands**

- `fhir validate <file>` — Validate FHIR R4 resources with StructureValidator
- `fhir fhirpath <expression> <file>` — Evaluate FHIRPath expressions
- `fhir inspect <file>` — Display resource structure with `--tree` and `--json` modes

**Bundle Operations**

- `fhir bundle analyze <file>` — Analyze Bundle contents with statistics
- `fhir bundle extract <file>` — Extract resources by type
- `fhir bundle refs <file>` — Extract and analyze references

**Conversion & Profiles**

- `fhir convert <input> <output>` — Bidirectional JSON ↔ YAML conversion
- `fhir profile show <url-or-file>` — View StructureDefinition profiles
- `fhir profile snapshot <file>` — Generate snapshots from differential
- `fhir profile validate <file>` — Validate StructureDefinition files

**Package Management**

- `fhir package load <path>` — Load FHIR IG packages (.tgz or directory)
- `fhir package list` — List loaded packages
- `fhir package resolve <url>` — Resolve canonical URLs to resources

**Resource Composition & Search**

- `fhir compose <template>` — Generate FHIR JSON from YAML/JSON templates
- `fhir search extract <resource> <params>` — Extract search index values
- `fhir search validate <file>` — Validate SearchParameter definitions
- `fhir search capability <profiles...>` — Generate CapabilityStatement fragments

**Infrastructure**

- fhir-runtime@0.7.2 integration
- JSON output mode (`--json`) for all commands
- YAML input/output support for all file-based commands
- 73 core StructureDefinition JSON files for offline validation
- Comprehensive test suite (123 tests passing)
- TypeScript with full type safety
- Commander.js-based CLI framework
