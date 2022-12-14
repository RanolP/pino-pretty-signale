import { ERROR_LIKE_KEYS, LOGGER_KEYS } from '../../constants.js';
import stringifySafe from 'fast-safe-stringify';
import { joinLinesWithIndentation } from '../../utils/internals/format.js';
import { prettifyError } from './error.js';
import { defaultColorizer } from '../../cli/colors/index.js';

/**
 * Prettifies a standard object. Special care is taken when processing the object
 * to handle child objects that are attached to keys known to contain error
 * objects.
 *
 * @param {object} input
 * @param {object} input.input The object to prettify.
 * @param {string} [input.indent] The indentation sequence to use. Default: `'    '`.
 * @param {string} [input.eol] The EOL sequence to use. Default: `'\n'`.
 * @param {string[]} [input.skipKeys] A set of object keys to exclude from the
 * prettified result. Default: `[]`.
 * @param {Object<string, function>} [input.customPrettifiers] Dictionary of
 * custom prettifiers. Default: `{}`.
 * @param {string[]} [input.errorLikeKeys] A set of object keys that contain
 * error objects. Default: `ERROR_LIKE_KEYS` constant.
 * @param {boolean} [input.excludeLoggerKeys] Indicates if known logger specific
 * keys should be excluded from prettification. Default: `true`.
 * @param {boolean} [input.singleLine] Should non-error keys all be formatted
 * on a single line? This does NOT apply to errors, which will still be
 * multi-line. Default: `false`
 *
 * @returns {string} The prettified string. This can be as little as `''` if
 * there was nothing to prettify.
 */
export function prettifyObject({
  input,
  indent = '    ',
  eol = '\n',
  skipKeys = [],
  customPrettifiers = {},
  errorLikeKeys = ERROR_LIKE_KEYS,
  excludeLoggerKeys = true,
  singleLine = false,
  colorizer = defaultColorizer,
}) {
  const keysToIgnore = [].concat(skipKeys);

  if (excludeLoggerKeys === true)
    Array.prototype.push.apply(keysToIgnore, LOGGER_KEYS);

  let result = '';

  // Split object keys into two categories: error and non-error
  const { plain, errors } = Object.entries(input).reduce(
    ({ plain, errors }, [k, v]) => {
      if (keysToIgnore.includes(k) === false) {
        // Pre-apply custom prettifiers, because all 3 cases below will need this
        const pretty =
          typeof customPrettifiers[k] === 'function'
            ? customPrettifiers[k](v, k, input)
            : v;
        if (errorLikeKeys.includes(k)) {
          errors[k] = pretty;
        } else {
          plain[k] = pretty;
        }
      }
      return { plain, errors };
    },
    { plain: {}, errors: {} },
  );

  if (singleLine) {
    // Stringify the entire object as a single JSON line
    if (Object.keys(plain).length > 0) {
      result += colorizer.greyMessage(stringifySafe(plain));
    }
    result += eol;
  } else {
    // Put each object entry on its own line
    Object.entries(plain).forEach(([keyName, keyValue]) => {
      // custom prettifiers are already applied above, so we can skip it now
      const lines =
        typeof customPrettifiers[keyName] === 'function'
          ? keyValue
          : stringifySafe(keyValue, null, 2);

      if (lines === undefined) return;

      const joinedLines = joinLinesWithIndentation({
        input: lines,
        indent,
        eol,
      });
      result += `${indent}${keyName}:${
        joinedLines.startsWith(eol) ? '' : ' '
      }${joinedLines}${eol}`;
    });
  }

  // Errors
  Object.entries(errors).forEach(([keyName, keyValue]) => {
    // custom prettifiers are already applied above, so we can skip it now
    const lines =
      typeof customPrettifiers[keyName] === 'function'
        ? keyValue
        : stringifySafe(keyValue, null, 2);

    if (lines === undefined) return;

    result += prettifyError({ keyName, lines, eol, indent });
  });

  return result;
}
