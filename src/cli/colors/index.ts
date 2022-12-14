import { LEVELS, LEVEL_NAMES } from '../../constants.js';
import { PlainPalette } from './palette/plain.js';
import { availableColors, colored, cyan, gray, white } from './palette/colored.js';
import type { Color } from 'colorette';

export type { Color };
export type Palette = {
  default: Color;
  60: Color;
  50: Color;
  40: Color;
  30: Color;
  20: Color;
  10: Color;
  message: Color;
  greyMessage: Color;
  [key: string | number]: Color | undefined;
};

function resolveCustomColoredColorizer(
  customColors: Array<[level: string, color: unknown]>,
): Record<string, unknown> {
  return customColors.reduce(
    (agg, [level, color]) => ({
      [level]:
        typeof availableColors[color] === 'function'
          ? availableColors[color]
          : white,
      ...agg,
    }),
    { default: white, message: cyan, greyMessage: gray },
  );
}

function colorizeLevel(useOnlyCustomProps: boolean) {
  return function (
    level: unknown,
    colorizer: unknown,
    {
      customLevels,
      customLevelNames,
    }: { customLevels?: unknown; customLevelNames?: unknown } = {},
  ) {
    const levels = useOnlyCustomProps
      ? customLevels || LEVELS
      : Object.assign({}, LEVELS, customLevels);
    const levelNames = useOnlyCustomProps
      ? customLevelNames || LEVEL_NAMES
      : Object.assign({}, LEVEL_NAMES, customLevelNames);

    let levelNum = 'default';
    if (Number.isInteger(+level)) {
      levelNum = Object.prototype.hasOwnProperty.call(levels, level)
        ? level
        : levelNum;
    } else {
      levelNum = Object.prototype.hasOwnProperty.call(
        levelNames,
        level.toLowerCase(),
      )
        ? levelNames[level.toLowerCase()]
        : levelNum;
    }

    const levelStr = levels[levelNum];

    return Object.prototype.hasOwnProperty.call(colorizer, levelNum)
      ? colorizer[levelNum](levelStr)
      : colorizer.default(levelStr);
  };
}

function plainColorizer(useOnlyCustomProps: boolean) {
  const newPlainColorizer = colorizeLevel(useOnlyCustomProps);
  const customColoredColorizer = function (level: unknown, opts: unknown) {
    return newPlainColorizer(level, PlainPalette, opts);
  };
  customColoredColorizer.message = PlainPalette.message;
  customColoredColorizer.greyMessage = PlainPalette.greyMessage;
  return customColoredColorizer;
}

function coloredColorizer(useOnlyCustomProps: boolean) {
  const newColoredColorizer = colorizeLevel(useOnlyCustomProps);
  const customColoredColorizer = function (level, opts) {
    return newColoredColorizer(level, colored, opts);
  };
  customColoredColorizer.message = colored.message;
  customColoredColorizer.greyMessage = colored.greyMessage;
  return customColoredColorizer;
}

function customColoredColorizerFactory(
  customColors,
  useOnlyCustomProps: boolean,
) {
  const onlyCustomColored = resolveCustomColoredColorizer(customColors);
  const customColored = useOnlyCustomProps
    ? onlyCustomColored
    : Object.assign({}, colored, onlyCustomColored);
  const colorizeLevelCustom = colorizeLevel(useOnlyCustomProps);

  const customColoredColorizer = function (level, opts) {
    return colorizeLevelCustom(level, customColored, opts);
  };
  customColoredColorizer.message =
    customColoredColorizer.message || customColored.message;
  customColoredColorizer.greyMessage =
    customColoredColorizer.greyMessage || customColored.greyMessage;

  return customColoredColorizer;
}

/**
 * Factory function get a function to colorized levels. The returned function
 * also includes a `.message(str)` method to colorize strings.
 *
 * @param {boolean} [useColors=false] When `true` a function that applies standard
 * terminal colors is returned.
 * @param {array[]} [customColors] Touple where first item of each array is the level index and the second item is the color
 * @param {boolean} [useOnlyCustomProps] When `true`, only use the provided custom colors provided and not fallback to default
 *
 * @returns {function} `function (level) {}` has a `.message(str)` method to
 * apply colorization to a string. The core function accepts either an integer
 * `level` or a `string` level. The integer level will map to a known level
 * string or to `USERLVL` if not known.  The string `level` will map to the same
 * colors as the integer `level` and will also default to `USERLVL` if the given
 * string is not a recognized level name.
 */
export default function getColorizer(
  useColors: boolean = false,
  customColors?: unknown[],
  useOnlyCustomProps?: boolean,
): () => unknown {
  if (useColors && customColors !== undefined) {
    return customColoredColorizerFactory(customColors, useOnlyCustomProps);
  } else if (useColors) {
    return coloredColorizer(useOnlyCustomProps);
  }

  return plainColorizer(useOnlyCustomProps);
}

export const defaultColorizer = getColorizer();
