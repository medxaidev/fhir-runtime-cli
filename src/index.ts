import { Command } from 'commander';
import { registerValidateCommand } from './commands/validate.js';
import { registerFhirPathCommand } from './commands/fhirpath.js';
import { registerInspectCommand } from './commands/inspect.js';
import { registerBundleCommand } from './commands/bundle.js';
import { registerConvertCommand } from './commands/convert.js';
import { registerProfileCommand } from './commands/profile.js';
import { registerPackageCommand } from './commands/package.js';
import { registerComposeCommand } from './commands/compose.js';
import { registerSearchCommand } from './commands/search.js';

/**
 * Create and configure the CLI program.
 */
export function createProgram(): Command {
  const program = new Command();

  program
    .name('fhir')
    .description('FHIR Runtime CLI — parse, validate, inspect FHIR R4 resources')
    .version('0.2.0');

  registerValidateCommand(program);
  registerFhirPathCommand(program);
  registerInspectCommand(program);
  registerBundleCommand(program);
  registerConvertCommand(program);
  registerProfileCommand(program);
  registerPackageCommand(program);
  registerComposeCommand(program);
  registerSearchCommand(program);

  return program;
}

/**
 * Run the CLI.
 */
export async function run(argv?: string[]): Promise<void> {
  const program = createProgram();
  await program.parseAsync(argv ?? process.argv);
}
