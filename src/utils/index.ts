import fastCopy from 'fast-copy';
import SonicBoom from 'sonic-boom';
import { isMainThread } from 'node:worker_threads';
import getColorizer from '../cli/colors/index.js';
import { LEVEL_KEY } from '../constants.js';

// This is leak free, it does not leave event handlers
import onExit from 'on-exit-leak-free';

const defaultColorizer = getColorizer();

export { buildSafeSonicBoom, filterLog };

export const internals = {
  deleteLogProperty,
  splitIgnoreKey,
};


/**
 * Splits the input key delimited by a dot character but not when it is preceded
 * by a backslash.
 *
 * @param {string} key A string identifying the property.
 *
 * @returns {string[]} Returns a list of string containing each delimited property.
 * e.g. `'prop2\.domain\.corp.prop2'` should return [ 'prop2.domain.com', 'prop2' ]
 */
function splitIgnoreKey(key) {
  const result = [];
  let backslash = false;
  let segment = '';

  for (let i = 0; i < key.length; i++) {
    const c = key.charAt(i);

    if (c === '\\') {
      backslash = true;
      continue;
    }

    if (backslash) {
      backslash = false;
      segment += c;
      continue;
    }

    /* Non-escaped dot, push to result */
    if (c === '.') {
      result.push(segment);
      segment = '';
      continue;
    }

    segment += c;
  }

  /* Push last entry to result */
  if (segment.length) {
    result.push(segment);
  }

  return result;
}

/**
 * Deletes a specified property from a log object if it exists.
 * This function mutates the passed in `log` object.
 *
 * @param {object} log The log object to be modified.
 * @param {string} property A string identifying the property to be deleted from
 * the log object. Accepts nested properties delimited by a `.`
 * Delimiter can be escaped to preserve property names that contain the delimiter.
 * e.g. `'prop1.prop2'` or `'prop2\.domain\.corp.prop2'`
 */
function deleteLogProperty(log, property) {
  const props = splitIgnoreKey(property);
  const propToDelete = props.pop();

  props.forEach((prop) => {
    if (!Object.prototype.hasOwnProperty.call(log, prop)) {
      return;
    }
    log = log[prop];
  });

  delete log[propToDelete];
}

/**
 * Filter a log object by removing or including keys accordingly.
 * When `includeKeys` is passed, `ignoredKeys` will be ignored.
 * One of ignoreKeys or includeKeys must be pass in.
 *
 * @param {object} input
 * @param {object} input.log The log object to be modified.
 * @param {Set<string> | Array<string> | undefined} input.ignoreKeys
 *  An array of strings identifying the properties to be removed.
 * @param {Set<string> | Array<string> | undefined} input.includeKeys
 *  An array of strings identifying the properties to be included.
 *
 * @returns {object} A new `log` object instance that
 *  either only includes the keys in ignoreKeys
 *  or does not include those in ignoredKeys.
 */
function filterLog({ log, ignoreKeys, includeKeys }) {
  const logCopy = fastCopy(log);

  if (includeKeys) {
    const logIncluded = {};

    includeKeys.forEach((key) => {
      logIncluded[key] = logCopy[key];
    });
    return logIncluded;
  }

  ignoreKeys.forEach((ignoreKey) => {
    deleteLogProperty(logCopy, ignoreKey);
  });
  return logCopy;
}

function noop() {}

/**
 * Creates a safe SonicBoom instance
 *
 * @param {object} opts Options for SonicBoom
 *
 * @returns {object} A new SonicBoom stream
 */
function buildSafeSonicBoom(opts) {
  const stream = new SonicBoom(opts);
  stream.on('error', filterBrokenPipe);
  // if we are sync: false, we must flush on exit
  if (!opts.sync && isMainThread) {
    setupOnExit(stream);
  }
  return stream;

  function filterBrokenPipe(err) {
    if (err.code === 'EPIPE') {
      stream.write = noop;
      stream.end = noop;
      stream.flushSync = noop;
      stream.destroy = noop;
      return;
    }
    stream.removeListener('error', filterBrokenPipe);
  }
}

function setupOnExit(stream) {
  /* istanbul ignore next */
  if (global.WeakRef && global.WeakMap && global.FinalizationRegistry) {
    onExit.register(stream, autoEnd);

    stream.on('close', function () {
      onExit.unregister(stream);
    });
  }
}

/* istanbul ignore next */
function autoEnd(stream, eventName) {
  // This check is needed only on some platforms

  if (stream.destroyed) {
    return;
  }

  if (eventName === 'beforeExit') {
    // We still have an event loop, let's use it
    stream.flush();
    stream.on('drain', function () {
      stream.end();
    });
  } else {
    // We do not have an event loop, so flush synchronously
    stream.flushSync();
  }
}
