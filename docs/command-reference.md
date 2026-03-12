# Command Reference

Complete reference for all `fhir-runtime-cli` commands.

## Global Options

All commands support these global options:

- `-V, --version` — Output the version number
- `-h, --help` — Display help for command

## Commands

### validate

Validate a FHIR R4 resource against its StructureDefinition.

```bash
fhir validate <file> [options]
```

**Options:**
- `--json` — Output in JSON format
- `--strict` — Treat warnings as errors (exit code 1)

**Examples:**
```bash
fhir validate patient.json
fhir validate patient.json --json
fhir validate patient.json --strict
```

**Exit Codes:**
- `0` — Validation passed
- `1` — Validation failed
- `2` — File not found or parse error

---

### fhirpath

Evaluate a FHIRPath expression against a FHIR resource.

```bash
fhir fhirpath <expression> <file> [options]
```

**Options:**
- `--boolean` — Evaluate as boolean expression
- `--json` — Output in JSON format

**Examples:**
```bash
fhir fhirpath "Patient.name.given" patient.json
fhir fhirpath "Patient.gender = 'male'" patient.json --boolean
fhir fhirpath "Patient.name.family" patient.json --json
```

---

### inspect

Display the structure and fields of a FHIR resource.

```bash
fhir inspect <file> [options]
```

**Options:**
- `--tree` — Display as tree structure
- `--json` — Output in JSON format

**Examples:**
```bash
fhir inspect patient.json
fhir inspect patient.json --tree
fhir inspect patient.json --json
```

---

### bundle

Analyze and manipulate FHIR Bundles.

#### bundle analyze

Analyze Bundle contents with statistics.

```bash
fhir bundle analyze <file> [options]
```

**Options:**
- `--json` — Output in JSON format
- `--verbose` — Show each entry's id and resourceType

**Examples:**
```bash
fhir bundle analyze bundle.json
fhir bundle analyze bundle.json --verbose
fhir bundle analyze bundle.json --json
```

#### bundle extract

Extract resources from a Bundle.

```bash
fhir bundle extract <file> [options]
```

**Options:**
- `--type <resourceType>` — Filter by resource type
- `--output <dir>` — Write each resource to a separate file
- `--json` — Output as JSON array

**Examples:**
```bash
fhir bundle extract bundle.json --type Patient
fhir bundle extract bundle.json --output ./resources/
fhir bundle extract bundle.json --json
```

#### bundle refs

Extract and analyze references from a Bundle.

```bash
fhir bundle refs <file> [options]
```

**Options:**
- `--json` — Output in JSON format
- `--type <refType>` — Filter by reference type (literal/absolute/contained/logical)

**Examples:**
```bash
fhir bundle refs bundle.json
fhir bundle refs bundle.json --type literal
fhir bundle refs bundle.json --json
```

---

### convert

Convert FHIR resources between JSON and YAML formats.

```bash
fhir convert <input> <output> [options]
```

**Options:**
- `--from <format>` — Source format (json/yaml, auto-detected)
- `--to <format>` — Target format (json/yaml)

**Examples:**
```bash
fhir convert patient.json patient.yaml
fhir convert patient.yaml patient.json
fhir convert patient.json patient.out --to yaml
```

---

### profile

View and manipulate FHIR StructureDefinition profiles.

#### profile show

Display a StructureDefinition profile.

```bash
fhir profile show <url-or-file> [options]
```

**Options:**
- `--full` — Show full metadata
- `--json` — Output in JSON format

**Examples:**
```bash
fhir profile show http://hl7.org/fhir/StructureDefinition/Patient
fhir profile show my-profile.json
fhir profile show my-profile.json --full
```

#### profile snapshot

Generate a snapshot from a differential StructureDefinition.

```bash
fhir profile snapshot <file> [options]
```

**Options:**
- `--output <file>` — Write output to file
- `--canonical` — Also output CanonicalProfile representation

**Examples:**
```bash
fhir profile snapshot my-profile.json
fhir profile snapshot my-profile.json --output snapshot.json
```

#### profile validate

Validate a StructureDefinition file.

```bash
fhir profile validate <file> [options]
```

**Options:**
- `--json` — Output in JSON format

**Examples:**
```bash
fhir profile validate my-profile.json
fhir profile validate my-profile.json --json
```

---

### package

Manage FHIR IG packages.

#### package load

Load a FHIR IG package from a directory or .tgz file.

```bash
fhir package load <path> [options]
```

**Options:**
- `--json` — Output in JSON format

**Examples:**
```bash
fhir package load ./hl7.fhir.us.core/
fhir package load ./hl7.fhir.us.core-9.0.0.tgz
```

#### package list

List all loaded packages.

```bash
fhir package list [options]
```

**Options:**
- `--json` — Output in JSON format
- `--verbose` — Show profile URLs for each package

**Examples:**
```bash
fhir package list
fhir package list --verbose
fhir package list --json
```

#### package resolve

Resolve a canonical URL to a resource.

```bash
fhir package resolve <url> [options]
```

**Options:**
- `--json` — Output in JSON format
- `--show` — Show the full StructureDefinition content

**Examples:**
```bash
fhir package resolve http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient
fhir package resolve <url> --show
```

---

### compose

Compose a normalized FHIR R4 JSON resource from a template.

```bash
fhir compose <template> [options]
```

**Options:**
- `--validate` — Validate the composed resource
- `--output <file>` — Write output to file
- `--pretty` — Pretty-print JSON (default: true)

**Examples:**
```bash
fhir compose patient-template.yaml
fhir compose patient-template.yaml --validate
fhir compose patient-template.yaml --output patient.json
```

---

### search

FHIR SearchParameter tools.

#### search extract

Extract search index values from a FHIR resource.

```bash
fhir search extract <resource-file> <search-params-file> [options]
```

**Options:**
- `--param <code>` — Only extract the specified parameter
- `--json` — Output in JSON format

**Examples:**
```bash
fhir search extract patient.json search-params.json
fhir search extract patient.json search-params.json --param name
fhir search extract patient.json search-params.json --json
```

#### search validate

Validate a SearchParameter definition.

```bash
fhir search validate <file> [options]
```

**Options:**
- `--json` — Output in JSON format

**Examples:**
```bash
fhir search validate search-param-name.json
fhir search validate search-param-name.json --json
```

#### search capability

Generate a CapabilityStatement REST fragment from profiles.

```bash
fhir search capability <profile-files...> [options]
```

**Options:**
- `--search-params <file>` — SearchParameter Bundle to associate
- `--mode <mode>` — REST mode: server or client (default: server)
- `--output <file>` — Write output to file
- `--pretty` — Pretty-print JSON (default: true)

**Examples:**
```bash
fhir search capability my-patient-profile.json
fhir search capability profile1.json profile2.json --search-params sp-bundle.json
fhir search capability profiles/*.json --output capability.json
```

---

## Exit Codes

All commands use consistent exit codes:

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Validation failure or business logic error |
| `2` | File error (not found, unreadable, bad format) |
| `3` | Input error (bad arguments/options) |
| `4` | Internal error |

## Output Formats

Most commands support `--json` flag for machine-readable output:

```bash
# Human-readable output (default)
fhir validate patient.json

# JSON output
fhir validate patient.json --json
```

JSON output can be piped to other tools:

```bash
fhir validate patient.json --json | jq '.valid'
fhir bundle analyze bundle.json --json | jq '.resourceTypes'
```
