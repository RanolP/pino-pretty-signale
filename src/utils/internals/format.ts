export interface JoinLinesWithIndent {
  input: string;
  indent?: string;
  eol?: string;
}

/**
 * Given a string with line separators, either `\r\n` or `\n`, add indentation
 * to all lines subsequent to the first line and rejoin the lines using an
 * end of line sequence.
 *
 * @param {object} input
 * @param {string} input.input The string to split and reformat.
 * @param {string} [input.indent] The indentation string. Default: `    ` (4 spaces).
 * @param {string} [input.eol] The end of line sequence to use when rejoining
 * the lines. Default: `'\n'`.
 *
 * @returns {string} A string with lines subsequent to the first indented
 * with the given indentation sequence.
 */
export function joinLinesWithIndentation({
  input,
  indent = '    ',
  eol = '\n',
}: JoinLinesWithIndent): string {
  return input.split(/\r?\n/).join(eol + indent);
}
