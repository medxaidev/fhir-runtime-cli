# Examples

Practical examples for common use cases.

## Basic Validation

### Validate a Patient Resource

```bash
fhir validate patient.json
```

### Validate with Strict Mode

Treat warnings as errors:

```bash
fhir validate patient.json --strict
```

### Get JSON Output

```bash
fhir validate patient.json --json
```

Output:
```json
{
  "valid": true,
  "resourceType": "Patient",
  "id": "example",
  "elementCount": 7
}
```

## FHIRPath Queries

### Extract Patient Name

```bash
fhir fhirpath "Patient.name.family" patient.json
```

### Check Gender

```bash
fhir fhirpath "Patient.gender = 'male'" patient.json --boolean
```

### Get All Given Names

```bash
fhir fhirpath "Patient.name.given" patient.json
```

### Complex Query

```bash
fhir fhirpath "Patient.telecom.where(system='phone').value" patient.json
```

## Bundle Operations

### Analyze a Transaction Bundle

```bash
fhir bundle analyze transaction-bundle.json --verbose
```

### Extract All Patients

```bash
fhir bundle extract bundle.json --type Patient --output ./patients/
```

### Find All References

```bash
fhir bundle refs bundle.json
```

### Filter Literal References

```bash
fhir bundle refs bundle.json --type literal --json
```

## Format Conversion

### JSON to YAML

```bash
fhir convert patient.json patient.yaml
```

### YAML to JSON

```bash
fhir convert patient.yaml patient.json
```

### Batch Conversion

```bash
# Convert all JSON files to YAML
for file in *.json; do
  fhir convert "$file" "${file%.json}.yaml"
done
```

## Profile Management

### View Core Patient Profile

```bash
fhir profile show http://hl7.org/fhir/StructureDefinition/Patient
```

### Generate Snapshot

```bash
fhir profile snapshot my-patient-profile.json --output snapshot.json
```

### Validate Custom Profile

```bash
fhir profile validate my-custom-profile.json
```

## Package Management

### Load US Core Package

```bash
fhir package load ./hl7.fhir.us.core-9.0.0.tgz
```

### List Loaded Packages

```bash
fhir package list --verbose
```

### Resolve US Core Patient

```bash
fhir package resolve http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient --show
```

## Resource Composition

### Compose from YAML Template

Create `patient-template.yaml`:

```yaml
resourceType: Patient
id: composed-patient
name:
  - use: official
    family: Doe
    given:
      - Jane
gender: female
birthDate: "1985-05-15"
```

Compose and validate:

```bash
fhir compose patient-template.yaml --validate
```

### Save to File

```bash
fhir compose patient-template.yaml --output patient.json
```

## Search Parameter Operations

### Extract Search Values

```bash
fhir search extract patient.json search-params-bundle.json
```

### Extract Specific Parameter

```bash
fhir search extract patient.json search-params.json --param name
```

### Validate SearchParameter

```bash
fhir search validate search-param-birthdate.json
```

### Generate CapabilityStatement

```bash
fhir search capability us-core-patient.json us-core-observation.json \
  --search-params search-params-bundle.json \
  --output capability.json
```

## Advanced Workflows

### Validate All Resources in Directory

```bash
for file in resources/*.json; do
  echo "Validating $file..."
  fhir validate "$file"
done
```

### Extract and Validate Bundle Resources

```bash
# Extract all resources
fhir bundle extract bundle.json --output ./extracted/

# Validate each extracted resource
for file in extracted/*.json; do
  fhir validate "$file"
done
```

### Convert and Validate

```bash
# Convert YAML to JSON
fhir convert patient.yaml patient.json

# Validate the result
fhir validate patient.json
```

### Pipeline with jq

```bash
# Get validation result and check if valid
fhir validate patient.json --json | jq '.valid'

# Extract resource types from bundle
fhir bundle analyze bundle.json --json | jq '.resourceTypes'

# Get all family names
fhir fhirpath "Patient.name.family" patient.json --json | jq '.[]'
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Validate FHIR Resources

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install -g fhir-runtime-cli
      - run: |
          for file in resources/*.json; do
            fhir validate "$file" --json
          done
```

### Pre-commit Hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash

echo "Validating FHIR resources..."

for file in $(git diff --cached --name-only --diff-filter=ACM | grep '\.json$'); do
  if [[ $file == resources/* ]]; then
    echo "Validating $file..."
    fhir validate "$file" || exit 1
  fi
done

echo "All resources valid!"
```

## Troubleshooting Examples

### Debug Validation Errors

```bash
# Get detailed validation output
fhir validate patient.json --json | jq '.issues'
```

### Check Resource Structure

```bash
# View as tree to understand structure
fhir inspect patient.json --tree
```

### Test FHIRPath Expression

```bash
# Test expression step by step
fhir fhirpath "Patient" patient.json
fhir fhirpath "Patient.name" patient.json
fhir fhirpath "Patient.name.family" patient.json
```

### Verify Bundle Contents

```bash
# Analyze bundle structure
fhir bundle analyze bundle.json --verbose

# Check references
fhir bundle refs bundle.json
```
