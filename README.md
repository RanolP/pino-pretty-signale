<div align="center">
    <h1>pino-pretty-signale</h1>
    <p>Pretty print pino log lines with style adopted from signale</p>
</div>

## Description

It is meant to be used as a drop-in replacement for [pino-pretty][] and also [signale][].
Several options are supported as same as the original package, but not all of them.
See [Options](#options) for more details.
Also, **it should not be used in production**.

## Highlights

- Fancy log line formatting inspired by [signale][].
- Be drop-in replacecment for [signale][] users with optional runtime ([signale] has no activity for a long time and is not actively maintained).

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
import pps from 'pino-pretty-signale';
pps.install({
  // you configuration here
});
```

### pino-pretty-signale/runtime (as an alternative to signale)

This module provides a drop-in replacement api for [signale][].

## Options

## Acknowledgements

- The base codes are briefly taken from [pino-pretty][], which is licensed under MIT, for basic compatibility.
  Thanks for sharing the great codes.

[pino-pretty]: https://github.com/pinojs/pino-pretty
[signale]: https://github.com/klaussinani/signale
