import { Command } from 'commander';
import { readFhirResource } from '../utils/loader.js';
import { getRuntime } from '../utils/context.js';
import {
  printSuccess,
  printError,
  printJson,
  printHeader,
  printList,
} from '../utils/printer.js';
import { ExitCode, handleError } from '../utils/errors.js';

interface ValidateOptions {
  json?: boolean;
  strict?: boolean;
}

/**
 * Execute the validate logic (exported for testing).
 */
export async function runValidate(
  filePath: string,
  options: ValidateOptions,
): Promise<void> {
  const resource = readFhirResource(filePath);
  const resourceType = resource.resourceType;

  const runtime = await getRuntime();
  const profileUrl = `http://hl7.org/fhir/StructureDefinition/${resourceType}`;
  const result = await runtime.validate(resource as never, profileUrl);

  const issues = result.issues ?? [];
  const errors = issues.filter((i: { severity: string }) => i.severity === 'error');
  const warnings = issues.filter((i: { severity: string }) => i.severity === 'warning');

  const isValid = options.strict
    ? errors.length === 0 && warnings.length === 0
    : errors.length === 0;

  if (options.json) {
    printJson({
      valid: isValid,
      resourceType,
      errors: errors.length,
      warnings: warnings.length,
      issues: issues.map((i: { severity: string; path?: string; message: string }) => ({
        severity: i.severity,
        path: i.path ?? '',
        message: i.message,
      })),
    });
  } else if (isValid) {
    printSuccess(`Resource Type: ${resourceType}`);
    printSuccess('Validation Passed');
    if (warnings.length > 0) {
      printHeader(`Warnings (${warnings.length})`);
      printList(
        warnings.map(
          (w: { path?: string; message: string }) =>
            `${w.path ?? ''} — warning: ${w.message}`,
        ),
      );
    }
  } else {
    printError(`Validation Failed (${errors.length} error(s), ${warnings.length} warning(s))`);
    printHeader('Issues');
    printList(
      issues.map(
        (i: { path?: string; severity: string; message: string }) =>
          `${i.path ?? ''} — ${i.severity}: ${i.message}`,
      ),
    );
  }

  process.exitCode = isValid ? ExitCode.SUCCESS : ExitCode.VALIDATION_FAILURE;
}

/**
 * Register the validate command.
 */
export function registerValidateCommand(program: Command): void {
  program
    .command('validate <file>')
    .description('Validate a FHIR resource')
    .option('--json', 'Output in JSON format')
    .option('--strict', 'Strict mode: treat warnings as errors')
    .action(async (file: string, opts: ValidateOptions) => {
      try {
        await runValidate(file, opts);
      } catch (err) {
        handleError(err);
      }
    });
}
