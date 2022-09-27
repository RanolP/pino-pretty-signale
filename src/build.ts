import { isColorSupported } from 'colorette';
import pump from 'pump';
import { Transform } from 'readable-stream';
import abstractTransport from 'pino-abstract-transport';
import sjs from 'secure-json-parse';
import colors from './cli/colors/index.js';
import {
  ERROR_LIKE_KEYS,
  MESSAGE_KEY,
  TIMESTAMP_KEY,
  LEVEL_KEY,
  LEVEL_NAMES,
} from './constants.js';
import { buildSafeSonicBoom, filterLog } from './utils/index.js';
import { isObject } from './utils/is-object.js';
import { prettifyMetadata } from './lib/format/metadata.js';
import { prettifyLevel } from './lib/format/level.js';
import { prettifyTime } from './lib/format/time.js';
import { prettifyMessage } from './lib/format/message.js';
import { prettifyErrorLog } from './lib/format/error-log.js';
import { prettifyObject } from './lib/format/object.js';

type Result<T> = { value: T } | { err: unknown };

const jsonParser = (input: string | Buffer): Result<any> => {
  try {
    return { value: sjs.parse(input, null, { protoAction: 'remove' }) };
  } catch (err) {
    return { err };
  }
};

export interface Options {
  colorize: boolean;
  crlf: boolean;
  errorLikeObjectKeys: string[];
  errorProps: string;
  customLevels: unknown | null;
  customColors: unknown | null;
  useOnlyCustomProps: boolean;
  levelFirst: boolean;
  messageKey: string;
  messageFormat: boolean;
  timestampKey: string;
  translateTime: boolean;
  useMetadata: boolean;
  outputStream: NodeJS.WriteStream;
  customPrettifiers: Record<string, unknown>;
  hideObject: boolean;
  ignore: string;
  include: undefined;
  singleLine: boolean;
}

const defaultOptions: Options = {
  colorize: isColorSupported,
  crlf: false,
  errorLikeObjectKeys: ERROR_LIKE_KEYS,
  errorProps: '',
  customLevels: null,
  customColors: null,
  useOnlyCustomProps: true,
  levelFirst: false,
  messageKey: MESSAGE_KEY,
  messageFormat: false,
  timestampKey: TIMESTAMP_KEY,
  translateTime: true,
  useMetadata: false,
  outputStream: process.stdout,
  customPrettifiers: {},
  hideObject: false,
  ignore: 'hostname',
  include: undefined,
  singleLine: false,
};

export function prettyFactory(options: Partial<Options>) {
  const opts = { ...defaultOptions, ...options };
  const EOL = opts.crlf ? '\r\n' : '\n';
  const INDENT = '    ';
  const messageKey = opts.messageKey;
  const levelKey = opts.levelKey;
  const levelLabel = opts.levelLabel;
  const minimumLevel = opts.minimumLevel;
  const messageFormat = opts.messageFormat;
  const timestampKey = opts.timestampKey;
  const errorLikeObjectKeys = opts.errorLikeObjectKeys;
  const errorProps = opts.errorProps.split(',');
  const useOnlyCustomProps =
    typeof opts.useOnlyCustomProps === 'boolean'
      ? opts.useOnlyCustomProps
      : opts.useOnlyCustomProps === 'true';
  const customLevels = opts.customLevels
    ? opts.customLevels.split(',').reduce(
        (agg, value, idx) => {
          const [levelName, levelIdx = idx] = value.split(':');

          agg[levelIdx] = levelName.toUpperCase();

          return agg;
        },
        { default: 'USERLVL' },
      )
    : {};
  const customLevelNames = opts.customLevels
    ? opts.customLevels.split(',').reduce((agg, value, idx) => {
        const [levelName, levelIdx = idx] = value.split(':');

        agg[levelName.toLowerCase()] = levelIdx;

        return agg;
      }, {})
    : {};
  const customColors = opts.customColors
    ? opts.customColors.split(',').reduce((agg, value) => {
        const [level, color] = value.split(':');

        const condition = useOnlyCustomProps
          ? opts.customLevels
          : customLevelNames[level] !== undefined;
        const levelNum = condition
          ? customLevelNames[level]
          : LEVEL_NAMES[level];
        const colorIdx = levelNum !== undefined ? levelNum : level;

        agg.push([colorIdx, color]);

        return agg;
      }, [])
    : undefined;
  const customProps = {
    customLevels,
    customLevelNames,
  };
  if (useOnlyCustomProps && !opts.customLevels) {
    customProps.customLevels = undefined;
    customProps.customLevelNames = undefined;
  }
  const customPrettifiers = opts.customPrettifiers;
  const includeKeys =
    opts.include !== undefined ? new Set(opts.include.split(',')) : undefined;
  const ignoreKeys =
    !includeKeys && opts.ignore ? new Set(opts.ignore.split(',')) : undefined;
  const hideObject = opts.hideObject;
  const singleLine = opts.singleLine;
  const colorizer = colors(opts.colorize, customColors, useOnlyCustomProps);

  return pretty;

  function pretty(inputData: unknown) {
    let log: {};
    if (!isObject(inputData)) {
      const parsed = jsonParser(inputData);
      if ('err' in parsed || !isObject(parsed.value)) {
        // pass through
        return inputData + EOL;
      }
      log = parsed.value;
    } else {
      log = inputData;
    }

    if (minimumLevel) {
      const condition = useOnlyCustomProps
        ? opts.customLevels
        : customLevelNames[minimumLevel] !== undefined;
      const minimum =
        (condition
          ? customLevelNames[minimumLevel]
          : LEVEL_NAMES[minimumLevel]) || Number(minimumLevel);
      const level = log[levelKey === undefined ? LEVEL_KEY : levelKey];
      if (level < minimum) return;
    }

    const prettifiedMessage = prettifyMessage({
      log,
      messageKey,
      colorizer,
      messageFormat,
      levelLabel,
      ...customProps,
      useOnlyCustomProps,
    });

    if (ignoreKeys || includeKeys) {
      log = filterLog({ log, ignoreKeys, includeKeys });
    }

    const prettifiedLevel = prettifyLevel({
      log,
      colorizer,
      levelKey,
      prettifier: customPrettifiers.level,
      ...customProps,
    });
    const prettifiedMetadata = prettifyMetadata({
      log,
      prettifiers: customPrettifiers,
    });
    const prettifiedTime = prettifyTime({
      log,
      translateFormat: opts.translateTime,
      timestampKey,
      prettifier: customPrettifiers.time,
    });

    let line = '';
    if (opts.levelFirst && prettifiedLevel) {
      line = `${prettifiedLevel}`;
    }

    if (prettifiedTime && line === '') {
      line = `${prettifiedTime}`;
    } else if (prettifiedTime) {
      line = `${line} ${prettifiedTime}`;
    }

    if (!opts.levelFirst && prettifiedLevel) {
      if (line.length > 0) {
        line = `${line} ${prettifiedLevel}`;
      } else {
        line = prettifiedLevel;
      }
    }

    if (prettifiedMetadata) {
      if (line.length > 0) {
        line = `${line} ${prettifiedMetadata}:`;
      } else {
        line = prettifiedMetadata;
      }
    }

    if (line.endsWith(':') === false && line !== '') {
      line += ':';
    }

    if (prettifiedMessage) {
      if (line.length > 0) {
        line = `${line} ${prettifiedMessage}`;
      } else {
        line = prettifiedMessage;
      }
    }

    if (line.length > 0 && !singleLine) {
      line += EOL;
    }

    // pino@7+ does not log this anymore
    if (log.type === 'Error' && log.stack) {
      const prettifiedErrorLog = prettifyErrorLog({
        log,
        errorLikeKeys: errorLikeObjectKeys,
        errorProperties: errorProps,
        indent: INDENT,
        eol: EOL,
      });
      if (singleLine) line += EOL;
      line += prettifiedErrorLog;
    } else if (!hideObject) {
      const skipKeys = [messageKey, levelKey, timestampKey].filter(
        (key) => typeof log[key] === 'string' || typeof log[key] === 'number',
      );
      const prettifiedObject = prettifyObject({
        input: log,
        skipKeys,
        customPrettifiers,
        errorLikeKeys: errorLikeObjectKeys,
        eol: EOL,
        indent: INDENT,
        singleLine,
        colorizer,
      });

      // In single line mode, include a space only if prettified version isn't empty
      if (singleLine && !/^\s$/.test(prettifiedObject)) {
        line += ' ';
      }
      line += prettifiedObject;
    }

    return line;
  }
}

export function build(opts: Partial<Options> = {}) {
  const pretty = prettyFactory(opts);
  return abstractTransport(
    function (source) {
      const stream = new Transform({
        objectMode: true,
        autoDestroy: true,
        transform(chunk, enc, cb) {
          const line = pretty(chunk);
          cb(null, line);
        },
      });

      let destination;

      if (
        typeof opts.destination === 'object' &&
        typeof opts.destination.write === 'function'
      ) {
        destination = opts.destination;
      } else {
        destination = buildSafeSonicBoom({
          dest: opts.destination || 1,
          append: opts.append,
          mkdir: opts.mkdir,
          sync: opts.sync, // by default sonic will be async
        });
      }

      source.on('unknown', function (line) {
        destination.write(line + '\n');
      });

      pump(source, stream, destination);
      return stream;
    },
    { parse: 'lines' },
  );
}

export { colors as colorizerFactory };
export default build;
