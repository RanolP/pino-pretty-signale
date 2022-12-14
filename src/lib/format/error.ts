import { joinLinesWithIndentation } from '../../utils/internals/format.js';

/**
 * Prettifies an error string into a multi-line format.
 * @param {object} input
 * @param {string} input.keyName The key assigned to this error in the log object
 * @param {string} input.lines The STRINGIFIED error. If the error field has a
 *  custom prettifier, that should be pre-applied as well
 * @param {string} input.indent The indentation sequence to use
 * @param {string} input.eol The EOL sequence to use
 */
export function prettifyError({ keyName, lines, eol, indent }) {
  let result = '';
  const joinedLines = joinLinesWithIndentation({ input: lines, indent, eol });
  const splitLines = `${indent}${keyName}: ${joinedLines}${eol}`.split(eol);

  for (let j = 0; j < splitLines.length; j += 1) {
    if (j !== 0) result += eol;

    const line = splitLines[j];
    if (/^\s*"stack"/.test(line)) {
      const matches = /^(\s*"stack":)\s*(".*"),?$/.exec(line);
      /* istanbul ignore else */
      if (matches && matches.length === 3) {
        const indentSize = /^\s*/.exec(line)[0].length + 4;
        const indentation = ' '.repeat(indentSize);
        const stackMessage = matches[2];
        result +=
          matches[1] +
          eol +
          indentation +
          JSON.parse(stackMessage).replace(/\n/g, eol + indentation);
      } else {
        result += line;
      }
    } else {
      result += line;
    }
  }

  return result;
}
