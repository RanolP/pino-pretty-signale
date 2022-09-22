import { ERROR_LIKE_KEYS, LOGGER_KEYS, MESSAGE_KEY } from '../../constants.js';
import { joinLinesWithIndentation } from '../../utils/internals/format.js';
import { isObject } from '../../utils/is-object.js';
import { prettifyObject } from './object.js';

export interface ErrorLog {
  log: unknown;
  messageKey?: string;
  indent?: string;
  eol?: string;
  errorLikeKeys?: string[];
  errorProperties?: string[];
}

/**
 * Given a log object that has a `type: 'Error'` key, prettify the object and
 * return the result. In other
 *
 * @param {object} input
 * @param {object} input.log The error log to prettify.
 * @param {string} [input.messageKey] The name of the key that contains a
 * general log message. This is not the error's message property but the logger
 * messsage property. Default: `MESSAGE_KEY` constant.
 * @param {string} [input.indent] The sequence to use for indentation. Default: `'    '`.
 * @param {string} [input.eol] The sequence to use for EOL. Default: `'\n'`.
 * @param {string[]} [input.errorLikeKeys] A set of keys that should be considered
 * to have error objects as values. Default: `ERROR_LIKE_KEYS` constant.
 * @param {string[]} [input.errorProperties] A set of specific error object
 * properties, that are not the value of `messageKey`, `type`, or `stack`, to
 * include in the prettified result. The first entry in the list may be `'*'`
 * to indicate that all sibiling properties should be prettified. Default: `[]`.
 *
 * @returns {string} A sring that represents the prettified error log.
 */
export function prettifyErrorLog({
  log,
  messageKey = MESSAGE_KEY,
  indent = '    ',
  eol = '\n',
  errorLikeKeys = ERROR_LIKE_KEYS,
  errorProperties = [],
}: ErrorLog): string {
  const stack = log.stack;
  const joinedLines = joinLinesWithIndentation({ input: stack, indent, eol });
  let result = `${indent}${joinedLines}${eol}`;

  if (errorProperties.length > 0) {
    const excludeProperties = LOGGER_KEYS.concat(messageKey, 'type', 'stack');
    let propertiesToPrint;
    if (errorProperties[0] === '*') {
      // Print all sibling properties except for the standard exclusions.
      propertiesToPrint = Object.keys(log).filter(
        (k) => excludeProperties.includes(k) === false,
      );
    } else {
      // Print only specified properties unless the property is a standard exclusion.
      propertiesToPrint = errorProperties.filter(
        (k) => excludeProperties.includes(k) === false,
      );
    }

    for (let i = 0; i < propertiesToPrint.length; i += 1) {
      const key = propertiesToPrint[i];
      if (key in log === false) continue;
      if (isObject(log[key])) {
        // The nested object may have "logger" type keys but since they are not
        // at the root level of the object being processed, we want to print them.
        // Thus, we invoke with `excludeLoggerKeys: false`.
        const prettifiedObject = prettifyObject({
          input: log[key],
          errorLikeKeys,
          excludeLoggerKeys: false,
          eol,
          indent: indent + indent,
        });
        result = `${result}${indent}${key}: {${eol}${prettifiedObject}${indent}}${eol}`;
        continue;
      }
      result = `${result}${indent}${key}: ${log[key]}${eol}`;
    }
  }

  return result;
}
