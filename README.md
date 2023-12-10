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

In order to use this library in your code, please also install `rustic`:

```bash
yarn add rustic
# OR
npm install rustic --save
```

### Creating BatchRunner

Create a new batch runner instance:

```ts
import { isOk } from 'rustic';
import { BatchRunner } from 'ug-micro-batching';

// with default batch size of 1 and concurrency of 1
const batchRunner = BatchRunner.create<string>();
// with provided batch size and concurrency values
const batchRunner = BatchRunner.create<string>({
  batchSize: 2, // 1 - 1000
  concurrency: 2, // 1 - 1000
});
```

Update batch size and concurrency values when batch runner is idle:

```ts
// update is allowed when the status is idle
const updateBatchSizeResult = batchRunner.updateBatchSize(5);
console.log(isOk(updateBatchSizeResult)); // true

// update is allowed when the status is idle
const updateConcurrencyResult = batchRunner.updateConcurrency(5);
console.log(isOk(updateConcurrencyResult)); // true
```

Providing invalid values will cause `start()` to return an error Result:

```ts
batchRunner.updateBatchSize(-100);
// OR
batchRunner.updateConcurrency(-100);

const result = batchRunner.start();
console.log(isOk(result)); // false
```

### Creating Jobs

Create job and append jobs for BatchRunner:

```ts
const job1 = Job.create<string>({
  id: 'job-1',
  jobFn: function () {
    return new Promise(function (res) {
      setTimeout(function () {
        res('response from job-1');
      }, 1000);
    });
  },
});

batchRunner.add(job1);
batchRunner.add(job2);
batchRunner.add(job3);
console.log(batchRunner.getJobsCount()); // 3

batchRunner.clearJobs();
console.log(batchRunner.getJobsCount()); // 0
```

### Getting BatchRunner status

Get batch runner status:

- returns status in either `idle`, `running` and `stopped` state
  - `idle` - The starting state of BatchRunner where the user can still update the configurations of the BatchRunner
  - `running` - Jobs are grouped into batches and running batches of jobs concurrently - BatchRunner configurations cannot be updated anymore
  - `stopped` - The final state of BatchRunner where either all jobs have been run or runner has been explicitly stopped by the user
- also includes processedJobs (jobs successfully processed) and failedJobs (jobs failed to process)

```ts
const batchRunnerState = batchRunner.getBatchRunnerState();
/**
 * BatchRunner on 'idle' state
 * {
 *   status: 'idle',
 *   processedJobs: [],
 *   failedJobs: [],
 * }
 *
 * BatchRunner on 'running' state
 * {
 *   status: 'running',
 *   processedJobs: [
 *     { id: '1', status: 'success', result: '1' },
 *     { id: '2', status: 'success', result: '2' },
 *   ],
 *   failedJobs: [
 *     { id: '3', status: 'success', result: '3' },
 *   ],
 * }
 *
 * BatchRunner on 'stopped' state
 * {
 *   status: 'stopped',
 *   processedJobs: [
 *     { id: '1', status: 'success', result: '1' },
 *     { id: '2', status: 'success', result: '2' },
 *     { id: '4', status: 'success', result: '4' },
 *     { id: '5', status: 'success', result: '5' },
 *   ],
 *   failedJobs: [
 *     { id: '3', status: 'success', result: '3' },
 *     { id: '6', status: 'success', result: '6' },
 *   ],
 * }
 */
```

### Running and stopping BatchRunner

Run batch runner:

```ts
batchRunner.start();
const state = batchRunner.getBatchRunnerState();
/**
 * {
 *   status: 'running',
 *   processedJobs: [...],
 *   failedJobs: [...],
 * }
 */
```

Stop batch runner:

```ts
batchRunner.stop();
const state = batchRunner.getBatchRunnerState();
/**
 * {
 *   status: 'stopped',
 *   processedJobs: [...],
 *   failedJobs: [...],
 * }
 */
```

Batch runner on completing all jobs:

```ts
// onStopped callback will be called when BatchRunner status is transitioned to 'stopped'.
// BatchRunner status is transitioned to 'stopped' when `batchRunner.stop()` is called or all jobs have been processed.
batchRunner.onStopped(function (state) {
  console.log(state);
  /**
   * {
   *   status: 'stopped',
   *   processedJobs: [...],
   *   failedJobs: [...],
   * }
   */
});
batchRunner.start();
```

## Technical design and decisions

### Libraries used

- [@supercharge/promise-pool](https://github.com/supercharge/promise-pool) - The 'BatchProcessor' library
- [rustic](https://github.com/franeklubi/rustic) - provides useful helper types (`Result`)
- [runtypes](https://github.com/pelotom/runtypes) - runtime type-checking and validation

### Code structure

Files are stored in a relatively flat structure where there are only 2 folders inside `./src` folder.
These folders are where unit tests and e2e tests files live.

Input validator functions live in `./src/validators.ts`.
All functions that involve user input in parameters will use their corresponding validators to validate user input (e.g. batch size).

`Result` type from the library rustic is used to reduce the case where exceptions are not handled.
Functions with user input will return `Result` type.
Functions that mutate local state will also retun `Result` type.

Unit tests are stored in folder(s) with the name `./src/__tests__` which contains unit tests files for their corresponding TS files with exported functions/logic. E2E tests are stored in `./src/__e2e__` and these e2e tests do not run as part of the regular (unit) tests. E2E tests do not contain any mocks for internal and system components like timer.

As the complexity of this library grows (e.g. more features, input, output, .etc), functions will need to be refactored into their logical files and folders (by type or by functionality) in order to keep the codebase maintainable.

### Production build

This library will be built targeting CommonJs and ESModule for release.

[Parceljs](https://parceljs.org/) is used as the build tool for this library due to it's simplicity (zero-config),
As the complexity of this library goes, a different build tool ([webpack](https://webpack.js.org/)?) might be needed for more flexibility in configuring how the library should be built.

**Artifacts:**

CommonJs release build can be found in `./dist/cjs`.

ESModule release build can be found in `./dist/module`.

Library types can be found in `./dist/index.d.ts`.

### Github Actions

There are 2 workflows setup for library.

- validate: checks linting & formatting, runs tests (unit and e2e) and builds code
- codeql-analysis: code vulnerability & security scanner using [CodeQL](https://github.com/dyliew/ug-micro-batching/security/code-scanning/tools/CodeQL/status/)

### Publishing library to NPM

To be implemented.

## Developing locally

**Tests:**

```bash
# run unit tests
yarn test:unit

# run e2e tests
yarn test:e2e

# run unit tests and e2e tests
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

- [ ] publish library to npm ([instructions](https://www.youtube.com/watch?v=QZdY4XYbqLI))
  - use commitlint to standardize commit messages for release and changelogs
  - use release tools like [semantic-release](https://github.com/semantic-release/semantic-release) or [release-it](https://github.com/release-it/release-it)
  - release on `main` branch updated using [Github Action For semantic Release](https://github.com/marketplace/actions/action-for-semantic-release)
- [ ] support alternative `BatchProcessor` provided by user
- [ ] BatchRunner to support more than one type of Job return result type
- [ ] re-evaluate `@supercharge/promise-pool` to support more batching features
  - evaluate [p-queue](https://github.com/sindresorhus/p-queue) which is arguably a more flexible batching processor
  - add support for retries, timeout, pause and resume
- [ ] improve unit tests by using property based testing with [fast-check](https://github.com/dubzzz/fast-check)
- [ ] improve unit tests coverage to 100%
- [x] add basic e2e tests
- [ ] consider usage of [fp-ts](https://github.com/gcanti/fp-ts) and [io-ts](https://github.com/gcanti/io-ts)
  - pros: many benefits we get from writing functional programming code
  - cons: opinionated implementation details which might not suit many users due to different programming paradigm
