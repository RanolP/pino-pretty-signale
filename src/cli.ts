#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import helpMe from 'help-me';
import pump from 'pump';
import sjp from 'secure-json-parse';
import JoyCon from 'joycon';
import stripJsonComments from 'strip-json-comments';
import { build } from './build.js';
import * as CONSTANTS from './constants.js';
import { isObject } from './utils.js';
import minimist from 'minimist';

export async function main() {
  const help = helpMe({
    dir: path.join(__dirname, 'help'),
    ext: '.txt',
  });

  function parseJSON(input: string) {
    return sjp.parse(stripJsonComments(input), null, { protoAction: 'remove' });
  }

  const joycon = new JoyCon({
    parseJSON,
    files: [
      'pino-pretty.config.cjs',
      'pino-pretty.config.js',
      '.pino-prettyrc',
      '.pino-prettyrc.json',
    ],
    stopDir: path.dirname(process.cwd()),
  });

  const cmd = minimist(process.argv.slice(2));

  helper(cmd);

  const DEFAULT_VALUE = '\0default';

  const optsRaw = minimist(process.argv, {
    alias: {
      colorize: 'c',
      crlf: 'f',
      errorProps: 'e',
      levelFirst: 'l',
      minimumLevel: 'L',
      customLevels: 'x',
      customColors: 'X',
      useOnlyCustomProps: 'U',
      errorLikeObjectKeys: 'k',
      messageKey: 'm',
      levelKey: CONSTANTS.LEVEL_KEY,
      levelLabel: 'b',
      messageFormat: 'o',
      timestampKey: 'a',
      translateTime: 't',
      ignore: 'i',
      include: 'I',
      hideObject: 'H',
      singleLine: 'S',
    },
    default: {
      messageKey: DEFAULT_VALUE,
      minimumLevel: DEFAULT_VALUE,
      levelKey: DEFAULT_VALUE,
      timestampKey: DEFAULT_VALUE,
    },
  });

  // Remove default values
  const optsFiltered = filter(optsRaw, (value) => value !== DEFAULT_VALUE);
  const config = loadConfig(optsFiltered.config);
  // Override config with cli options
  let opts = Object.assign({}, config, optsFiltered);
  // set defaults
  opts.errorLikeObjectKeys = opts.errorLikeObjectKeys || 'err,error';
  opts.errorProps = opts.errorProps || '';

  const res = build(opts);
  pump(process.stdin, res);

  // https://github.com/pinojs/pino/pull/358
  /* istanbul ignore next */
  if (!process.stdin.isTTY && !fs.fstatSync(process.stdin.fd).isFile()) {
    process.once('SIGINT', function noOp() {});
  }

  function loadConfig(configPath: string) {
    const files = configPath ? [path.resolve(configPath)] : undefined;
    const result = joycon.loadSync(files);
    if (result.path && !isObject(result.data)) {
      configPath = configPath || path.basename(result.path);
      throw new Error(`Invalid runtime configuration file: ${configPath}`);
    }
    if (configPath && !result.data) {
      throw new Error(
        `Failed to load runtime configuration file: ${configPath}`,
      );
    }
    return result.data;
  }

  function filter<T extends Record<string, unknown>>(
    obj: T,
    cb: (value: T[keyof T], key: keyof T) => boolean,
  ): Partial<T> {
    return Object.keys(obj).reduce((acc, key: keyof T) => {
      const value = obj[key];
      if (cb(value, key)) {
        acc[key] = value;
      }
      return acc;
    }, {} as Partial<T>);
  }

  function helper(cmd: Record<string, unknown>) {
    if (cmd.h || cmd.help) {
      help.toStdout();
    }
  }
}
