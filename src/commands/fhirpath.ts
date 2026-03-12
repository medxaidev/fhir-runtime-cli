import { Command } from 'commander';
import { evalFhirPath, evalFhirPathBoolean } from 'fhir-runtime';
import { readFhirResource } from '../utils/loader.js';
import { printJson, printError } from '../utils/printer.js';
import { ExitCode, handleError, inputError } from '../utils/errors.js';

interface FhirPathOptions {
  json?: boolean;
  boolean?: boolean;
}

/**
 * Execute the fhirpath logic (exported for testing).
 */
export async function runFhirPath(
  expression: string,
  filePath: string,
  options: FhirPathOptions,
): Promise<void> {
  if (!expression || expression.trim().length === 0) {
    throw inputError('FHIRPath expression is required');
  }

  const resource = readFhirResource(filePath);

  try {
    if (options.boolean) {
      const result = evalFhirPathBoolean(expression, resource);

      if (options.json) {
        printJson({ expression, result });
      } else {
        console.log(String(result));
      }
    } else {
      const results = evalFhirPath(expression, resource);

      if (options.json) {
        printJson({ expression, results });
      } else {
        console.log(JSON.stringify(results));
      }
    }

    process.exitCode = ExitCode.SUCCESS;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    printError(`FHIRPath evaluation failed: ${message}`);
    process.exitCode = ExitCode.VALIDATION_FAILURE;
  }
}

/**
 * Register the fhirpath command.
 */
export function registerFhirPathCommand(program: Command): void {
  program
    .command('fhirpath <expression> <file>')
    .description('Evaluate a FHIRPath expression against a FHIR resource')
    .option('--json', 'Output in JSON format')
    .option('--boolean', 'Evaluate as boolean (true/false)')
    .action(async (expression: string, file: string, opts: FhirPathOptions) => {
      try {
        await runFhirPath(expression, file, opts);
      } catch (err) {
        handleError(err);
      }
    });
}
