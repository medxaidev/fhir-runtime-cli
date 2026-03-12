# Getting Started with fhir-runtime-cli

## Installation

### Global Installation

```bash
npm install -g fhir-runtime-cli
```

After installation, the `fhir` command will be available globally:

```bash
fhir --version
# Output: 0.2.0
```

### Using npx

You can run the CLI without installing it globally:

```bash
npx fhir-runtime-cli validate patient.json
```

## Your First Commands

### 1. Validate a FHIR Resource

Create a simple Patient resource file `patient.json`:

```json
{
  "resourceType": "Patient",
  "id": "example",
  "name": [
    {
      "use": "official",
      "family": "Smith",
      "given": ["John"]
    }
  ],
  "gender": "male",
  "birthDate": "1990-01-01"
}
```

Validate it:

```bash
fhir validate patient.json
```

Expected output:

```
✔ Validation Passed

  Resource: Patient/example
  Elements:  7
```

### 2. Query with FHIRPath

Extract the patient's family name:

```bash
fhir fhirpath "Patient.name.family" patient.json
```

Output:

```
["Smith"]
```

Check if the patient is male:

```bash
fhir fhirpath "Patient.gender = 'male'" patient.json --boolean
```

Output:

```
true
```

### 3. Inspect Resource Structure

View the resource structure:

```bash
fhir inspect patient.json
```

View as a tree:

```bash
fhir inspect patient.json --tree
```

### 4. Convert Between Formats

Convert JSON to YAML:

```bash
fhir convert patient.json patient.yaml
```

Convert back to JSON:

```bash
fhir convert patient.yaml patient-copy.json
```

## Next Steps

- Explore [Bundle Operations](./bundle-operations.md)
- Learn about [Profile Management](./profile-management.md)
- Read the [Command Reference](./command-reference.md)
- Check out [Examples](./examples.md)

## Getting Help

```bash
# General help
fhir --help

# Command-specific help
fhir validate --help
fhir bundle --help
```

## Common Issues

### File Not Found

Make sure the file path is correct and the file exists:

```bash
# Use absolute path
fhir validate /path/to/patient.json

# Or relative path from current directory
fhir validate ./patient.json
```

### Invalid JSON/YAML

The CLI will report parsing errors with line numbers:

```
Error: Failed to parse JSON
  Line: 5
  Message: Unexpected token
```

### Validation Failures

Validation errors will show the specific constraint violations:

```
✖ Validation Failed

  Errors:
  - Patient.name: minimum cardinality is 1, but found 0
  - Patient.gender: value 'unknown' is not in value set
```
