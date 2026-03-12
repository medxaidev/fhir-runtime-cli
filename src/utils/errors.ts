/**
 * Standardized exit codes for fhir-runtime-cli.
 */
export const ExitCode = {
  SUCCESS: 0,
  VALIDATION_FAILURE: 1,
  FILE_ERROR: 2,
  INPUT_ERROR: 3,
  INTERNAL_ERROR: 4,
} as const;

export type ExitCodeValue = (typeof ExitCode)[keyof typeof ExitCode];

/**
 * CLI-specific error with associated exit code.
 */
export class CliError extends Error {
  readonly exitCode: ExitCodeValue;

  constructor(message: string, exitCode: ExitCodeValue) {
    super(message);
    this.name = 'CliError';
    this.exitCode = exitCode;
  }
}

/**
 * Create a file-not-found error.
 */
export function fileNotFoundError(filePath: string): CliError {
  return new CliError(`File not found: ${filePath}`, ExitCode.FILE_ERROR);
}

/**
 * Create a file-read error.
 */
export function fileReadError(filePath: string, cause?: Error): CliError {
  const msg = cause
    ? `Failed to read file: ${filePath} — ${cause.message}`
    : `Failed to read file: ${filePath}`;
  return new CliError(msg, ExitCode.FILE_ERROR);
}

/**
 * Create a parse error.
 */
export function parseError(filePath: string, detail?: string): CliError {
  const msg = detail
    ? `Failed to parse file: ${filePath} — ${detail}`
    : `Failed to parse file: ${filePath}`;
  return new CliError(msg, ExitCode.FILE_ERROR);
}

/**
 * Create an input error (bad arguments/options).
 */
export function inputError(message: string): CliError {
  return new CliError(message, ExitCode.INPUT_ERROR);
}

/**
 * Handle a CliError or unknown error, print to stderr, and exit.
 */
export function handleError(err: unknown): never {
  if (err instanceof CliError) {
    process.stderr.write(`Error: ${err.message}\n`);
    process.exit(err.exitCode);
  }
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Internal error: ${message}\n`);
  process.exit(ExitCode.INTERNAL_ERROR);
}
