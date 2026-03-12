import chalk from 'chalk';

/**
 * Output format mode.
 */
export type OutputMode = 'text' | 'json';

/**
 * Print a success message (green checkmark).
 */
export function printSuccess(message: string): void {
  console.log(chalk.green('✔') + ' ' + message);
}

/**
 * Print an error message (red cross).
 */
export function printError(message: string): void {
  console.error(chalk.red('✖') + ' ' + message);
}

/**
 * Print a warning message (yellow).
 */
export function printWarning(message: string): void {
  console.warn(chalk.yellow('⚠') + ' ' + message);
}

/**
 * Print an info message (blue).
 */
export function printInfo(label: string, value: string): void {
  console.log(chalk.cyan(label) + ' ' + value);
}

/**
 * Print a key-value pair.
 */
export function printKeyValue(key: string, value: string, indent = 0): void {
  const pad = ' '.repeat(indent);
  console.log(`${pad}${chalk.bold(key)}  ${value}`);
}

/**
 * Print JSON output to stdout.
 */
export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Print a section header.
 */
export function printHeader(title: string): void {
  console.log('');
  console.log(chalk.bold.underline(title));
  console.log('');
}

/**
 * Print a list of items with indentation.
 */
export function printList(items: string[], indent = 2): void {
  const pad = ' '.repeat(indent);
  for (const item of items) {
    console.log(`${pad}${item}`);
  }
}

/**
 * Build a tree representation of a nested object.
 */
export function buildTree(
  obj: Record<string, unknown>,
  prefix = '',
  isLast = true,
): string[] {
  const lines: string[] = [];
  const keys = Object.keys(obj);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = obj[key];
    const last = i === keys.length - 1;
    const connector = last ? '└ ' : '├ ';
    const extension = last ? '  ' : '│ ';

    lines.push(`${prefix}${connector}${key}`);

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const subtree = buildTree(
        value as Record<string, unknown>,
        prefix + extension,
        last,
      );
      lines.push(...subtree);
    }
  }

  return lines;
}
