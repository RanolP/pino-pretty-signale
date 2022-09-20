<div align="center">
    <h1>pino-pretty-signale</h1>
    <p>Pretty print pino log lines with style adopted from signale</p>
</div>

## Description

It is meant to be used as a drop-in replacement for [pino-pretty][] without any configuration. Also, **it should be used in development**.

## Highlights

- [signale][] like formatting style.
- optional [signale][] compatible runtime api.

## Usage

### pino-pretty-signale (as a binary)

You can pipe your pino log lines to this module and it will pretty print them.
For example:

```sh
node your-app.js | pino-pretty-signale
```

### pino-pretty-signale (as a library)

Configure pino-pretty-signale programmable way.
Be aware that it should not be used in production.

```js
const pps = require('pino-pretty-signale');
pps.install({
  // you configuration here
});
```

### pino-pretty-signale/runtime (for compat)

This module provides a drop-in replacement api for [signale][].

## Acknowledgements

- The base codes are briefly taken from [pino-pretty][], which is licensed under MIT.
  Thanks for sharing the great codes.

[pino-pretty]: https://github.com/pinojs/pino-pretty
[signale]: https://github.com/klaussinani/signale
