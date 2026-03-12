import { Command } from 'commander';
import { readFhirResource, writeOutputFile } from '../utils/loader.js';
import {
  printSuccess,
  printInfo,
} from '../utils/printer.js';
import { ExitCode, handleError } from '../utils/errors.js';
import { runValidate } from './validate.js';

interface ComposeOptions {
  validate?: boolean;
  output?: string;
  pretty?: boolean;
}

/**
 * Execute the compose logic (exported for testing).
 */
export async function runCompose(
  templatePath: string,
  options: ComposeOptions,
): Promise<void> {
  const resource = readFhirResource(templatePath);
  const resourceType = resource.resourceType;
  const id = (resource.id as string) ?? '';

  const indent = options.pretty !== false ? 2 : 0;
  const jsonOutput = JSON.stringify(resource, null, indent);

  if (options.output) {
    writeOutputFile(options.output, jsonOutput + '\n');
    printSuccess('Resource composed');
    printInfo('Type:  ', resourceType);
    if (id) printInfo('ID:    ', id);
    printInfo('Output:', options.output);
  } else {
    printSuccess('Resource composed');
    printInfo('Type:  ', resourceType);
    if (id) printInfo('ID:    ', id);
    console.log('');
    console.log(jsonOutput);
  }

  process.exitCode = ExitCode.SUCCESS;

  if (options.validate) {
    console.log('');
    await runValidate(templatePath, { json: false });
  }
}

/**
 * Register the compose command.
 */
export function registerComposeCommand(program: Command): void {
  program
    .command('compose <template>')
    .description('Compose a normalized FHIR R4 JSON resource from a template (YAML/JSON)')
    .option('--validate', 'Validate the composed resource')
    .option('--output <file>', 'Write output to file')
    .option('--pretty', 'Pretty-print JSON (default: true)')
    .action(async (template: string, opts: ComposeOptions) => {
      try {
        await runCompose(template, opts);
      } catch (err) {
        handleError(err);
      }
    });
}
