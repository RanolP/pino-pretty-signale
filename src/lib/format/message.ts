import { defaultColorizer } from "../../cli/colors/index.js";
import { LEVELS, LEVEL_KEY, LEVEL_LABEL, MESSAGE_KEY } from "../../constants.js";

/**
 * Prettifies a message string if the given `log` has a message property.
 *
 * @param {object} input
 * @param {object} input.log The log object with the message to colorize.
 * @param {string} [input.messageKey='msg'] The property of the `log` that is the
 * message to be prettified.
 * @param {string|function} [input.messageFormat=undefined] A format string or function that defines how the
 *  logged message should be formatted, e.g. `'{level} - {pid}'`.
 * @param {function} [input.colorizer] A colorizer function that has a
 * `.message(str)` method attached to it. This function should return a colorized
 * string which will be the "prettified" message. Default: a no-op colorizer.
 * @param {string} [input.levelLabel='levelLabel'] The label used to output the log level
 * @param {string} [input.levelKey='level'] The key to find the level under.
 * @param {object} [input.customLevels] The custom levels where key as the level index and value as the level name.
 *
 * @returns {undefined|string} If the message key is not found, or the message
 * key is not a string, then `undefined` will be returned. Otherwise, a string
 * that is the prettified message.
 */
export function prettifyMessage({
  log,
  messageFormat,
  messageKey = MESSAGE_KEY,
  colorizer = defaultColorizer,
  levelLabel = LEVEL_LABEL,
  levelKey = LEVEL_KEY,
  customLevels,
  useOnlyCustomProps,
}) {
  if (messageFormat && typeof messageFormat === 'string') {
    const message = String(messageFormat).replace(
      /{([^{}]+)}/g,
      function (match, p1) {
        // return log level as string instead of int
        if (p1 === levelLabel && log[levelKey]) {
          const condition = useOnlyCustomProps
            ? customLevels === undefined
            : customLevels[log[levelKey]] === undefined;
          return condition
            ? LEVELS[log[levelKey]]
            : customLevels[log[levelKey]];
        }
        // Parse nested key access, e.g. `{keyA.subKeyB}`.
        return p1.split('.').reduce(function (prev, curr) {
          if (prev && prev[curr]) {
            return prev[curr];
          }
          return '';
        }, log);
      },
    );
    return colorizer.message(message);
  }
  if (messageFormat && typeof messageFormat === 'function') {
    const msg = messageFormat(log, messageKey, levelLabel);
    return colorizer.message(msg);
  }
  if (messageKey in log === false) return undefined;
  if (typeof log[messageKey] !== 'string') return undefined;
  return colorizer.message(log[messageKey]);
}
