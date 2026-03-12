import { Command } from 'commander';
import * as yaml from 'js-yaml';
import {
  readFileAsObject,
  detectFormat,
  writeOutputFile,
} from '../utils/loader.js';
import type { FileFormat } from '../utils/loader.js';
import { printSuccess } from '../utils/printer.js';
import { ExitCode, handleError, inputError } from '../utils/errors.js';

interface ConvertOptions {
  from?: string;
  to?: string;
  pretty?: boolean;
}

/**
 * Infer the target format from the output file extension, or from --to flag.
 */
function resolveFormats(
  inputPath: string,
  outputPath: string,
  options: ConvertOptions,
): { fromFmt: FileFormat; toFmt: FileFormat } {
  const fromFmt: FileFormat = (options.from as FileFormat) ?? detectFormat(inputPath);
  let toFmt: FileFormat;

  if (options.to) {
    toFmt = options.to as FileFormat;
  } else {
    toFmt = detectFormat(outputPath);
  }

  if (fromFmt === toFmt) {
    throw inputError(`Source and target formats are the same: ${fromFmt}`);
  }

  return { fromFmt, toFmt };
}

/**
 * Execute the convert logic (exported for testing).
 */
export async function runConvert(
  inputPath: string,
  outputPath: string,
  options: ConvertOptions,
): Promise<void> {
  const { toFmt } = resolveFormats(inputPath, outputPath, options);

  const obj = readFileAsObject(inputPath);

  let output: string;
  if (toFmt === 'yaml') {
    output = yaml.dump(obj, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
      sortKeys: false,
    });
  } else {
    const indent = options.pretty !== false ? 2 : 0;
    output = JSON.stringify(obj, null, indent) + '\n';
  }

  writeOutputFile(outputPath, output);
  printSuccess(`Converted to ${toFmt}: ${outputPath}`);
  process.exitCode = ExitCode.SUCCESS;
}

/**
 * Register the convert command.
 */
export function registerConvertCommand(program: Command): void {
  program
    .command('convert <input> <output>')
    .description('Convert a FHIR resource between JSON and YAML formats')
    .option('--from <format>', 'Source format (json/yaml, auto-detected from extension)')
    .option('--to <format>', 'Target format (json/yaml, auto-detected from extension)')
    .option('--pretty', 'Pretty-print JSON output (default: true)')
    .action(async (input: string, output: string, opts: ConvertOptions) => {
      try {
        await runConvert(input, output, opts);
      } catch (err) {
        handleError(err);
      }
    });
}
