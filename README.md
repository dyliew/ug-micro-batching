# Micro-batching library

![validate](https://github.com/dyliew/ug-micro-batching/actions/workflows/validate.yml/badge.svg?branch=main)

## Overview

Micro-batching is a technique used in processing pipelines where individual tasks are grouped together into small batches.
This can improve throughput by reducing the number of requests made to a downstream system.
Your task is to implement a micro-batching library, with the following requirements:

- it should allow the caller to submit a single Job, and it should return a JobResult
- it should process accepted Jobs in batches using a BatchProcessor
  - Don't implement BatchProcessor. This should be a dependency of your library.
- it should provide a way to configure the batching behaviour i.e. size and frequency
- it should expose a shutdown method which returns after all previously accepted Jobs are processed

## Usage

TODO

## Technical design and decisions

### Libraries used

- [@supercharge/promise-pool](https://github.com/supercharge/promise-pool) - BatchProcessor library
- [rustic](https://github.com/franeklubi/rustic) - provides useful helper types (`Result` and `Option`)
- [runtypes](https://github.com/pelotom/runtypes) - runtime type-checking and validation

### Code structure

TODO

### Production build

This library will be built targeting CommonJs and ESModule for release.

[Parceljs](https://parceljs.org/) is used as the build tool for this library due to it's simplicity (zero-config),
As the complexity of this library goes, a different build tool ([webpack](https://webpack.js.org/)?) might be needed for more flexibility in configuring how the library should be built.

**Artefacts:**

CommonJs release build can be found in `./dist/cjs`.

ESModule release build can be found in `./dist/module`.

Library types can be found in `./dist/index.d.ts`.

### Publishing library to NPM

To be implemented.

## Developing locally

**Unit tests:**

```bash
# run unit tests
yarn test

# run unit tests with coverage report
yarn test:ci
```

**Linting check:**

```bash
# uses eslint and prettier
yarn lint
```

**Format files:**

```bash
# automatically fixes linting issues with eslint and prettier
yarn format
```

**Build library:**

```bash
# builds code into ./dist folder
yarn build
```

## Future improvements

- publish library to npm ([instructions](https://www.youtube.com/watch?v=QZdY4XYbqLI))
  - use commitlint to standardize commit messages for release and changelogs
  - use release tools like [semantic-release](https://github.com/semantic-release/semantic-release) or [release-it](https://github.com/release-it/release-it)
  - release on `main` branch updated using [Github Action For semantic Release](https://github.com/marketplace/actions/action-for-semantic-release)
- support alternative `BatchProcessor` provided by user
- re-evaluate `@supercharge/promise-pool` to support more batching features
  - evaluate [p-queue](https://github.com/sindresorhus/p-queue) which is arguably a more flexible batching processor
  - add support for retries, timeout, pause and resume
- improve unit tests by using property based testing with [fast-check](https://github.com/dubzzz/fast-check)
- consider usage of [fp-ts](https://github.com/gcanti/fp-ts) and [io-ts](https://github.com/gcanti/io-ts)
  - pros: many benefits we get from writing functional programming code
  - cons: opinionated implementation details which might not suit many users due to different programming paradigm
