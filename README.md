# fhir-runtime-cli

[![npm version](https://img.shields.io/npm/v/fhir-runtime-cli.svg)](https://www.npmjs.com/package/fhir-runtime-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/fhir-runtime-cli.svg)](https://nodejs.org)

A powerful command-line tool for working with FHIR R4 resources. Validate, inspect, query, convert, and analyze FHIR data without writing code.

Built on [fhir-runtime](https://github.com/nicholasgasior/fhir-runtime) v0.7.2.

## Features

- ✅ **Validate** FHIR resources against StructureDefinitions
- 🔍 **Query** with FHIRPath expressions
- 📊 **Inspect** resource structure and fields
- 📦 **Bundle** analysis and manipulation
- 🔄 **Convert** between JSON and YAML formats
- 📋 **Profile** management and snapshot generation
- 📚 **Package** loading for FHIR IG support
- 🛠️ **Compose** resources from templates
- 🔎 **Search** parameter extraction and validation

## Installation

```bash
# Install globally
npm install -g fhir-runtime-cli

# Or use directly with npx
npx fhir-runtime-cli --help

# Verify installation
fhir --version
```

## Quick Start

```bash
# Validate a FHIR resource
fhir validate patient.json

# Query with FHIRPath
fhir fhirpath "Patient.name.given" patient.json

# Inspect resource structure
fhir inspect patient.json --tree

# Analyze a Bundle
fhir bundle analyze bundle.json

# Convert JSON to YAML
fhir convert patient.json patient.yaml

# View a Profile
fhir profile show http://hl7.org/fhir/StructureDefinition/Patient
```

## Commands

### `fhir validate <file>`

Validate a FHIR R4 resource against its StructureDefinition.

```bash
fhir validate patient.json
fhir validate patient.json --json
fhir validate patient.json --strict
```

| Option     | Description                            |
| ---------- | -------------------------------------- |
| `--json`   | Output in JSON format                  |
| `--strict` | Treat warnings as errors (exit code 1) |

### `fhir fhirpath <expression> <file>`

Evaluate a FHIRPath expression against a FHIR resource.

```bash
fhir fhirpath "Patient.name.given" patient.json
fhir fhirpath "Patient.gender = 'male'" patient.json --boolean
fhir fhirpath "Patient.name.family" patient.json --json
```

| Option      | Description                    |
| ----------- | ------------------------------ |
| `--boolean` | Evaluate as boolean expression |
| `--json`    | Output in JSON format          |

### `fhir inspect <file>`

Display the structure and fields of a FHIR resource.

```bash
fhir inspect patient.json
fhir inspect patient.json --tree
fhir inspect patient.json --json
```

| Option   | Description               |
| -------- | ------------------------- |
| `--tree` | Display as tree structure |
| `--json` | Output in JSON format     |

### `fhir bundle <subcommand>`

Analyze and manipulate FHIR Bundles.

#### `fhir bundle analyze <file>`

```bash
fhir bundle analyze bundle.json
fhir bundle analyze bundle.json --json
fhir bundle analyze bundle.json --verbose
```

| Option      | Description                           |
| ----------- | ------------------------------------- |
| `--json`    | Output in JSON format                 |
| `--verbose` | Show each entry's id and resourceType |

#### `fhir bundle extract <file>`

```bash
fhir bundle extract bundle.json --type Patient
fhir bundle extract bundle.json --type Patient --output ./out/
fhir bundle extract bundle.json --json
```

| Option                  | Description                            |
| ----------------------- | -------------------------------------- |
| `--type <resourceType>` | Filter by resource type                |
| `--output <dir>`        | Write each resource to a separate file |
| `--json`                | Output as JSON array                   |

#### `fhir bundle refs <file>`

```bash
fhir bundle refs bundle.json
fhir bundle refs bundle.json --json
fhir bundle refs bundle.json --type literal
```

| Option             | Description                                                   |
| ------------------ | ------------------------------------------------------------- |
| `--json`           | Output in JSON format                                         |
| `--type <refType>` | Filter by reference type (literal/absolute/contained/logical) |

### `fhir convert <input> <output>`

Convert FHIR resources between JSON and YAML formats.

```bash
fhir convert patient.json patient.yaml
fhir convert patient.yaml patient.json
fhir convert patient.json patient.out --from json --to yaml
```

| Option            | Description                              |
| ----------------- | ---------------------------------------- |
| `--from <format>` | Source format (json/yaml, auto-detected) |
| `--to <format>`   | Target format (json/yaml)                |

### `fhir profile <subcommand>`

View and manipulate FHIR StructureDefinition profiles.

#### `fhir profile show <url-or-file>`

```bash
fhir profile show http://hl7.org/fhir/StructureDefinition/Patient
fhir profile show my-profile.json
fhir profile show my-profile.json --full
fhir profile show my-profile.json --json
```

| Option   | Description           |
| -------- | --------------------- |
| `--full` | Show full metadata    |
| `--json` | Output in JSON format |

#### `fhir profile snapshot <file>`

```bash
fhir profile snapshot my-profile.json
fhir profile snapshot my-profile.json --output snapshot.json
```

| Option            | Description                                 |
| ----------------- | ------------------------------------------- |
| `--output <file>` | Write output to file                        |
| `--canonical`     | Also output CanonicalProfile representation |

#### `fhir profile validate <file>`

```bash
fhir profile validate my-profile.json
fhir profile validate my-profile.json --json
```

| Option   | Description           |
| -------- | --------------------- |
| `--json` | Output in JSON format |

### `fhir package <subcommand>`

Manage FHIR IG packages.

#### `fhir package load <path>`

```bash
fhir package load ./hl7.fhir.us.core/
fhir package load ./hl7.fhir.us.core-9.0.0.tgz
```

| Option   | Description           |
| -------- | --------------------- |
| `--json` | Output in JSON format |

#### `fhir package list`

```bash
fhir package list
fhir package list --verbose
fhir package list --json
```

| Option      | Description                        |
| ----------- | ---------------------------------- |
| `--json`    | Output in JSON format              |
| `--verbose` | Show profile URLs for each package |

#### `fhir package resolve <url>`

```bash
fhir package resolve http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient
fhir package resolve <url> --show
fhir package resolve <url> --json
```

| Option   | Description                               |
| -------- | ----------------------------------------- |
| `--json` | Output in JSON format                     |
| `--show` | Show the full StructureDefinition content |

### `fhir compose <template>`

Compose a normalized FHIR R4 JSON resource from a YAML or JSON template.

```bash
fhir compose patient-template.yaml
fhir compose patient-template.yaml --validate
fhir compose patient-template.yaml --output patient.json
```

| Option            | Description                    |
| ----------------- | ------------------------------ |
| `--validate`      | Validate the composed resource |
| `--output <file>` | Write output to file           |

### `fhir search <subcommand>`

FHIR SearchParameter tools.

#### `fhir search extract <resource-file> <search-params-file>`

```bash
fhir search extract patient.json search-param-name.json
fhir search extract patient.json search-param-name.json --json
```

| Option           | Description                          |
| ---------------- | ------------------------------------ |
| `--param <code>` | Only extract the specified parameter |
| `--json`         | Output in JSON format                |

#### `fhir search validate <file>`

```bash
fhir search validate search-param-name.json
fhir search validate search-param-name.json --json
```

| Option   | Description           |
| -------- | --------------------- |
| `--json` | Output in JSON format |

#### `fhir search capability <profile-files...>`

```bash
fhir search capability my-patient-profile.json
fhir search capability profile1.json profile2.json --search-params sp-bundle.json
```

| Option                   | Description                                   |
| ------------------------ | --------------------------------------------- |
| `--search-params <file>` | SearchParameter Bundle to associate           |
| `--mode <mode>`          | REST mode: server or client (default: server) |
| `--output <file>`        | Write output to file                          |

## Exit Codes

| Code | Meaning                                        |
| ---- | ---------------------------------------------- |
| `0`  | Success                                        |
| `1`  | Validation failure                             |
| `2`  | File error (not found, unreadable, bad format) |
| `3`  | Input error (bad arguments/options)            |
| `4`  | Internal error                                 |

## Supported Formats

- **JSON** (`.json`)
- **YAML** (`.yaml`, `.yml`)

All commands that accept files support both JSON and YAML input.

## Documentation

- [Getting Started](./docs/getting-started.md)
- [Command Reference](./docs/command-reference.md)
- [Examples](./docs/examples.md)

## Requirements

- Node.js >= 18
- fhir-runtime >= 0.7.2

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/fhir-runtime-cli.git
cd fhir-runtime-cli

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npx vitest
```

## Publishing

This package is published to npm. To publish a new version:

```bash
# Update version in package.json
npm version patch  # or minor, or major

# Build and test
npm run prepublishOnly

# Publish to npm
npm publish
```

## License

MIT © Fangjun

## Acknowledgments

Built on [fhir-runtime](https://github.com/nicholasgasior/fhir-runtime) by Nicholas Gasior.
