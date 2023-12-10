import { isOk } from 'rustic';
import { BatchRunner } from '../BatchRunner';
import { Job } from '../Job';
import { createTimedFailedJob, createTimedJob } from './helpers';
import { JobResult } from '../types';

describe('BatchRunner', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should create a new BatchRunner with the provided options', () => {
      const runner = BatchRunner.create<string>({
        batchSize: 10,
        concurrency: 2,
      }).data as BatchRunner<string>;
      expect(runner).toBeInstanceOf(BatchRunner);
    });

    it('should create a new BatchRunner instance without options', () => {
      const processor = BatchRunner.create<string>().data as BatchRunner<string>;
      expect(processor).toBeInstanceOf(BatchRunner);
    });
  });

  describe('when batchRunner is idle', () => {
    it('should return the current status of the batchRunner', () => {
      const runner = BatchRunner.create<string>().data as BatchRunner<string>;
      expect(runner.getBatchRunnerState()).toEqual({
        status: 'idle',
        processedJobs: [],
        failedJobs: [],
      });
    });

    it('should update the batch size successfully', () => {
      const runner = BatchRunner.create<string>().data as BatchRunner<string>;
      const result = runner.updateBatchSize(10);
      expect(isOk(result)).toBe(true);
    });
    it.each([0, -10])('should return error on invalid batch size: %s', (batchSize) => {
      const runner = BatchRunner.create<string>().data as BatchRunner<string>;
      const result = runner.updateBatchSize(batchSize);
      expect(isOk(result)).toBe(false);
    });

    it('should update the concurrency successfully', () => {
      const runner = BatchRunner.create<string>().data as BatchRunner<string>;
      const result = runner.updateConcurrency(10);
      expect(isOk(result)).toBe(true);
    });
    it.each([0, -10])('should return error on invalid concurrency: %s', (batchSize) => {
      const runner = BatchRunner.create<string>().data as BatchRunner<string>;
      const result = runner.updateConcurrency(batchSize);
      expect(isOk(result)).toBe(false);
    });

    it('should add job to the job queue successfully', () => {
      const runner = BatchRunner.create<string>().data as BatchRunner<string>;
      const job = Job.create({ id: '1', jobFn: jest.fn() });
      const result = runner.addJob(job.data as Job<string>);
      expect(isOk(result)).toBe(true);
      expect(result.data as JobResult<unknown>).toEqual({ id: '1', status: 'idle' });
      expect(runner.getJobsCount()).toBe(1);
    });

    it('should clear the job queue successfully', () => {
      const runner = BatchRunner.create<string>().data as BatchRunner<string>;
      const job = Job.create({ jobFn: jest.fn() });

      runner.addJob(job.data as Job<string>);
      expect(runner.getJobsCount()).toBe(1);

      const result = runner.clearJobs();
      expect(isOk(result)).toBe(true);
      expect(runner.getJobsCount()).toBe(0);
    });
  });

  describe('when batchRunner is running', () => {
    it('should return the current status of the batchRunner', () => {
      const runner = BatchRunner.create<string>({ batchSize: 2, concurrency: 2 }).data as BatchRunner<string>;
      for (let i = 0; i < 10; i++) {
        runner.addJob(Job.create({ id: String(i), jobFn: jest.fn() }).data as Job<string>);
      }
      runner.start();

      expect(runner.getBatchRunnerState()).toEqual({
        status: 'running',
        processedJobs: [],
        failedJobs: [],
      });
    });

    it('should return error on batch size update', () => {
      const runner = BatchRunner.create<string>({ batchSize: 2, concurrency: 2 }).data as BatchRunner<string>;
      for (let i = 0; i < 10; i++) {
        runner.addJob(Job.create({ id: String(i), jobFn: jest.fn() }).data as Job<string>);
      }
      runner.start();

      const result = runner.updateBatchSize(10);

      expect(isOk(result)).toEqual(false);
      expect(result.data).toEqual(new Error(`Cannot update 'batchSize' when processor is not in 'idle' status`));
    });
    it('should return error on concurrency update', () => {
      const processor = BatchRunner.create<string>({ batchSize: 2, concurrency: 2 }).data as BatchRunner<string>;
      for (let i = 0; i < 10; i++) {
        processor.addJob(Job.create({ id: String(i), jobFn: jest.fn() }).data as Job<string>);
      }
      processor.start();

      const result = processor.updateConcurrency(10);

      expect(isOk(result)).toEqual(false);
      expect(result.data).toEqual(new Error(`Cannot update 'concurrency' when processor is not in 'idle' status`));
    });
    it('should return error on adding new job', () => {
      const runner = BatchRunner.create<string>({ batchSize: 2, concurrency: 2 }).data as BatchRunner<string>;
      for (let i = 0; i < 10; i++) {
        runner.addJob(Job.create({ id: String(i), jobFn: jest.fn() }).data as Job<string>);
      }
      runner.start();

      const result = runner.addJob(Job.create({ jobFn: jest.fn() }).data as Job<string>);

      expect(isOk(result)).toEqual(false);
      expect(result.data).toEqual(new Error(`Cannot add job when processor is not in 'idle' status`));
    });
    it('should return error on clear job queue', () => {
      const runner = BatchRunner.create<string>({ batchSize: 2, concurrency: 2 }).data as BatchRunner<string>;
      for (let i = 0; i < 10; i++) {
        runner.addJob(Job.create({ id: String(i), jobFn: jest.fn() }).data as Job<string>);
      }
      runner.start();

      const result = runner.clearJobs();

      expect(isOk(result)).toEqual(false);
      expect(result.data).toEqual(new Error(`Cannot clear job queue when processor is not in 'idle' status`));
    });
    it('should return error on start called again', () => {
      const runner = BatchRunner.create<string>({ batchSize: 2, concurrency: 2 }).data as BatchRunner<string>;
      for (let i = 0; i < 10; i++) {
        runner.addJob(Job.create({ id: String(i), jobFn: jest.fn() }).data as Job<string>);
      }
      runner.start();

      const result = runner.start();

      expect(isOk(result)).toEqual(false);
      expect(result.data).toEqual(new Error(`Processor is not in 'idle' status`));
    });
  });

  describe('when batchRunner is stopped', () => {
    it('should be able to stop running processor', async () => {
      const onStoppedCallback = jest.fn();
      const runner = BatchRunner.create<string>({ batchSize: 1, concurrency: 2 }).data as BatchRunner<string>;
      for (let i = 1; i <= 10; i++) {
        if (i % 3 === 0) {
          // every 3rd job will fail
          runner.addJob(createTimedFailedJob(1000, String(i)).data as Job<string>);
        } else {
          runner.addJob(createTimedJob(1000, String(i)).data as Job<string>);
        }
      }
      runner.onStopped(onStoppedCallback);
      runner.start();
      await jest.advanceTimersByTimeAsync(2100);

      const result = runner.stop();

      expect(result.status).toEqual('stopped');
      // since only 2.1s have passed, only 1st, 2nd, 4th jobs should be succesfully processed
      expect(result.processedJobs).toEqual([
        { id: '1', status: 'success', result: '1' },
        { id: '2', status: 'success', result: '2' },
        { id: '4', status: 'success', result: '4' },
      ]);
      // since only 2.1s have passed, only 3rd failed job should be processed
      expect(result.failedJobs).toEqual([{ id: '3', status: 'failure', error: new Error('3') }]);

      expect(onStoppedCallback).toHaveBeenCalledTimes(1);
      expect(onStoppedCallback).toHaveBeenCalledWith({
        status: 'stopped',
        processedJobs: [
          { id: '1', status: 'success', result: '1' },
          { id: '2', status: 'success', result: '2' },
          { id: '4', status: 'success', result: '4' },
        ],
        failedJobs: [{ id: '3', status: 'failure', error: new Error('3') }],
      });

      // advancing remaining time to complete remaining in-flight jobs
      await jest.advanceTimersByTimeAsync(2100);
      expect(result.processedJobs).toEqual([
        { id: '1', status: 'success', result: '1' },
        { id: '2', status: 'success', result: '2' },
        { id: '4', status: 'success', result: '4' },
        { id: '5', result: '5', status: 'success' },
      ]);
      expect(result.failedJobs).toEqual([
        { id: '3', status: 'failure', error: new Error('3') },
        { id: '6', status: 'failure', error: new Error('6') },
      ]);
    });

    it('should complete all jobs and return job status', async () => {
      const onStoppedCallback = jest.fn();
      const runner = BatchRunner.create<string>({ batchSize: 1, concurrency: 2 }).data as BatchRunner<string>;
      for (let i = 1; i <= 10; i++) {
        if (i % 3 === 0) {
          // every 3rd job will fail
          runner.addJob(createTimedFailedJob(1000, String(i)).data as Job<string>);
        } else {
          runner.addJob(createTimedJob(1000, String(i)).data as Job<string>);
        }
      }
      runner.onStopped(onStoppedCallback);
      runner.start();
      await jest.advanceTimersByTimeAsync(5100);

      expect(runner.getBatchRunnerState()).toEqual({
        status: 'stopped',
        processedJobs: [
          { id: '1', status: 'success', result: '1' },
          { id: '2', status: 'success', result: '2' },
          { id: '4', status: 'success', result: '4' },
          { id: '5', status: 'success', result: '5' },
          { id: '7', status: 'success', result: '7' },
          { id: '8', status: 'success', result: '8' },
          { id: '10', status: 'success', result: '10' },
        ],
        failedJobs: [
          { id: '3', status: 'failure', error: new Error('3') },
          { id: '6', status: 'failure', error: new Error('6') },
          { id: '9', status: 'failure', error: new Error('9') },
        ],
      });

      expect(onStoppedCallback).toHaveBeenCalledTimes(1);
      expect(onStoppedCallback).toHaveBeenCalledWith({
        status: 'stopped',
        processedJobs: [
          { id: '1', status: 'success', result: '1' },
          { id: '2', status: 'success', result: '2' },
          { id: '4', status: 'success', result: '4' },
          { id: '5', status: 'success', result: '5' },
          { id: '7', status: 'success', result: '7' },
          { id: '8', status: 'success', result: '8' },
          { id: '10', status: 'success', result: '10' },
        ],
        failedJobs: [
          { id: '3', status: 'failure', error: new Error('3') },
          { id: '6', status: 'failure', error: new Error('6') },
          { id: '9', status: 'failure', error: new Error('9') },
        ],
      });
    });

    it('should stop when there are no jobs provided', async () => {
      const onStoppedCallback = jest.fn();

      const runner = BatchRunner.create<string>({ batchSize: 1, concurrency: 2 }).data as BatchRunner<string>;
      runner.onStopped(onStoppedCallback);

      runner.start();
      await jest.advanceTimersByTimeAsync(1);

      expect(runner.getBatchRunnerState()).toEqual({
        status: 'stopped',
        processedJobs: [],
        failedJobs: [],
      });
      expect(onStoppedCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('when unsupported operations are called', () => {
    it("should return error when 'pause' is called", () => {
      const runner = BatchRunner.create<string>().data as BatchRunner<string>;
      const result = runner.pause();
      expect(isOk(result)).toBe(false);
      expect(result.data).toEqual(new Error(`Operation 'pause' is not supported yet`));
    });
    it("should return error when 'resume' is called", () => {
      const runner = BatchRunner.create<string>().data as BatchRunner<string>;
      const result = runner.resume();
      expect(isOk(result)).toBe(false);
      expect(result.data).toEqual(new Error(`Operation 'resume' is not supported yet`));
    });
  });

  describe('when alias functions are called', () => {
    it("should call 'stop' when 'shutdown' is called", () => {
      const runner = BatchRunner.create<string>().data as BatchRunner<string>;
      const stopMock = jest.spyOn(runner, 'stop');
      runner.shutdown();
      expect(stopMock).toHaveBeenCalledTimes(1);
    });
  });
});

describe('create BatchRunner', () => {
  it('should create a new BatchRunner instance with the provided options', () => {
    const result = BatchRunner.create<string>({
      batchSize: 10,
      concurrency: 2,
    });
    expect(isOk(result)).toEqual(true);
    expect(result.data).toBeInstanceOf(BatchRunner);
  });

  it('should create a new BatchRunner instance without options', () => {
    const result = BatchRunner.create<string>();
    expect(isOk(result)).toEqual(true);
    expect(result.data).toBeInstanceOf(BatchRunner);
  });

  it('should return error on invalid option values', () => {
    const result = BatchRunner.create<string>({
      batchSize: -10,
      concurrency: -2,
    });
    expect(isOk(result)).toEqual(false);
    expect(result.data).toBeInstanceOf(Error);
  });
});
