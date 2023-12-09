import { isOk } from 'rustic';
import { BatchingProcessor, createBatchingProcessor } from './BatchingProcessor';
import { createJob } from './Job';
import { Job } from './Job';

const createTimedJob = (time: number, id?: string) => {
  return createJob({
    id,
    jobFn: () => new Promise((resolve) => setTimeout(() => resolve(id), time)),
  });
};
const createTimedFailedJob = (time: number, id?: string) => {
  return createJob({
    id,
    jobFn: () => new Promise((_resolve, reject) => setTimeout(() => reject(new Error(id)), time)),
  });
};

describe('BatchingProcessor', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should create a new BatchingProcessor instance with the provided options', () => {
      const batchingProcessor = new BatchingProcessor({
        batchSize: 10,
        concurrency: 2,
      });
      expect(batchingProcessor).toBeInstanceOf(BatchingProcessor);
    });

    it('should create a new BatchingProcessor instance without options', () => {
      const batchingProcessor = new BatchingProcessor();
      expect(batchingProcessor).toBeInstanceOf(BatchingProcessor);
    });
  });

  describe('when batchingProcessor is idle', () => {
    it('should return the current status of the batchingProcessor', () => {
      const batchingProcessor = new BatchingProcessor();
      expect(batchingProcessor.getJobStatus()).toEqual({
        status: 'idle',
        processedJobs: [],
        failedJobs: [],
      });
    });

    it('should update the batch size successfully', () => {
      const batchingProcessor = new BatchingProcessor();
      const result = batchingProcessor.updateBatchSize(10);
      expect(isOk(result)).toBe(true);
    });
    it.each([0, -10])('should return error on invalid batch size: %s', (batchSize) => {
      const batchingProcessor = new BatchingProcessor();
      const result = batchingProcessor.updateBatchSize(batchSize);
      expect(isOk(result)).toBe(false);
    });

    it('should update the concurrency successfully', () => {
      const batchingProcessor = new BatchingProcessor();
      const result = batchingProcessor.updateConcurrency(10);
      expect(isOk(result)).toBe(true);
    });
    it.each([0, -10])('should return error on invalid concurrency: %s', (batchSize) => {
      const batchingProcessor = new BatchingProcessor();
      const result = batchingProcessor.updateConcurrency(batchSize);
      expect(isOk(result)).toBe(false);
    });

    it('should add job to the job queue successfully', () => {
      const batchingProcessor = new BatchingProcessor();
      const job = createJob({ jobFn: jest.fn() });
      const result = batchingProcessor.addJob(job.data as Job<unknown>);
      expect(isOk(result)).toBe(true);
      expect(batchingProcessor.getJobsCount()).toBe(1);
    });

    it('should clear the job queue successfully', () => {
      const batchingProcessor = new BatchingProcessor();
      const job = createJob({ jobFn: jest.fn() });

      batchingProcessor.addJob(job.data as Job<unknown>);
      expect(batchingProcessor.getJobsCount()).toBe(1);

      const result = batchingProcessor.clearJobs();
      expect(isOk(result)).toBe(true);
      expect(batchingProcessor.getJobsCount()).toBe(0);
    });
  });

  describe('when batchingProcessor is running', () => {
    it('should return the current status of the batchingProcessor', () => {
      const batchingProcessor = new BatchingProcessor({ batchSize: 2, concurrency: 2 });
      for (let i = 0; i < 10; i++) {
        batchingProcessor.addJob(createJob({ id: String(i), jobFn: jest.fn() }).data as Job<unknown>);
      }
      batchingProcessor.start();

      expect(batchingProcessor.getJobStatus()).toEqual({
        status: 'running',
        processedJobs: [],
        failedJobs: [],
      });
    });

    it('should return error on batch size update', () => {
      const batchingProcessor = new BatchingProcessor({ batchSize: 2, concurrency: 2 });
      for (let i = 0; i < 10; i++) {
        batchingProcessor.addJob(createJob({ id: String(i), jobFn: jest.fn() }).data as Job<unknown>);
      }
      batchingProcessor.start();

      const result = batchingProcessor.updateBatchSize(10);

      expect(isOk(result)).toEqual(false);
      expect(result.data).toEqual(new Error(`Cannot update 'batchSize' when processor is not in 'idle' status`));
    });
    it('should return error on concurrency update', () => {
      const batchingProcessor = new BatchingProcessor({ batchSize: 2, concurrency: 2 });
      for (let i = 0; i < 10; i++) {
        batchingProcessor.addJob(createJob({ id: String(i), jobFn: jest.fn() }).data as Job<unknown>);
      }
      batchingProcessor.start();

      const result = batchingProcessor.updateConcurrency(10);

      expect(isOk(result)).toEqual(false);
      expect(result.data).toEqual(new Error(`Cannot update 'concurrency' when processor is not in 'idle' status`));
    });
    it('should return error on adding new job', () => {
      const batchingProcessor = new BatchingProcessor({ batchSize: 2, concurrency: 2 });
      for (let i = 0; i < 10; i++) {
        batchingProcessor.addJob(createJob({ id: String(i), jobFn: jest.fn() }).data as Job<unknown>);
      }
      batchingProcessor.start();

      const result = batchingProcessor.addJob(createJob({ jobFn: jest.fn() }).data as Job<unknown>);

      expect(isOk(result)).toEqual(false);
      expect(result.data).toEqual(new Error(`Cannot add job when processor is not in 'idle' status`));
    });
    it('should return error on clear job queue', () => {
      const batchingProcessor = new BatchingProcessor({ batchSize: 2, concurrency: 2 });
      for (let i = 0; i < 10; i++) {
        batchingProcessor.addJob(createJob({ id: String(i), jobFn: jest.fn() }).data as Job<unknown>);
      }
      batchingProcessor.start();

      const result = batchingProcessor.clearJobs();

      expect(isOk(result)).toEqual(false);
      expect(result.data).toEqual(new Error(`Cannot clear job queue when processor is not in 'idle' status`));
    });
    it('should return error on start called again', () => {
      const batchingProcessor = new BatchingProcessor({ batchSize: 2, concurrency: 2 });
      for (let i = 0; i < 10; i++) {
        batchingProcessor.addJob(createJob({ id: String(i), jobFn: jest.fn() }).data as Job<unknown>);
      }
      batchingProcessor.start();

      const result = batchingProcessor.start();

      expect(isOk(result)).toEqual(false);
      expect(result.data).toEqual(new Error(`Processor is not in 'idle' status`));
    });
  });

  describe('when batchingProcessor is stopped', () => {
    it('should be able to stop running processor', async () => {
      const batchingProcessor = new BatchingProcessor({ batchSize: 1, concurrency: 2 });
      for (let i = 1; i <= 10; i++) {
        if (i % 3 === 0) {
          // every 3rd job will fail
          batchingProcessor.addJob(createTimedFailedJob(1000, String(i)).data as Job<unknown>);
        } else {
          batchingProcessor.addJob(createTimedJob(1000, String(i)).data as Job<unknown>);
        }
      }
      batchingProcessor.start();
      await jest.advanceTimersByTimeAsync(2100);

      const result = batchingProcessor.stop();

      expect(result.status).toEqual('stopped');
      // since only 2.1s have passed, only 1st, 2nd, 4th jobs should be succesfully processed
      expect(result.processedJobs).toEqual([
        { id: '1', status: 'success', result: '1' },
        { id: '2', status: 'success', result: '2' },
        { id: '4', status: 'success', result: '4' },
      ]);
      // since only 2.1s have passed, only 3rd failed job should be processed
      expect(result.failedJobs).toEqual([{ id: '3', status: 'failure', error: new Error('3') }]);

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
      const batchingProcessor = new BatchingProcessor({ batchSize: 1, concurrency: 2 });
      for (let i = 1; i <= 10; i++) {
        if (i % 3 === 0) {
          // every 3rd job will fail
          batchingProcessor.addJob(createTimedFailedJob(1000, String(i)).data as Job<unknown>);
        } else {
          batchingProcessor.addJob(createTimedJob(1000, String(i)).data as Job<unknown>);
        }
      }
      batchingProcessor.start();
      await jest.advanceTimersByTimeAsync(5100);

      expect(batchingProcessor.getJobStatus()).toEqual({
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
  });

  describe('when unsupported operations are called', () => {
    it("should return error when 'pause' is called", () => {
      const batchingProcessor = new BatchingProcessor();
      const result = batchingProcessor.pause();
      expect(isOk(result)).toBe(false);
      expect(result.data).toEqual(new Error(`Operation 'pause' is not supported yet`));
    });
    it("should return error when 'resume' is called", () => {
      const batchingProcessor = new BatchingProcessor();
      const result = batchingProcessor.resume();
      expect(isOk(result)).toBe(false);
      expect(result.data).toEqual(new Error(`Operation 'resume' is not supported yet`));
    });
  });

  describe('when alias functions are called', () => {
    it("should call 'stop' when 'shutdown' is called", () => {
      const batchingProcessor = new BatchingProcessor();
      const stopMock = jest.spyOn(batchingProcessor, 'stop');
      batchingProcessor.shutdown();
      expect(stopMock).toHaveBeenCalledTimes(1);
    });
  });
});

describe('createBatchingProcessor', () => {
  it('should create a new BatchingProcessor instance with the provided options', () => {
    const result = createBatchingProcessor({
      batchSize: 10,
      concurrency: 2,
    });
    expect(isOk(result)).toEqual(true);
    expect(result.data).toBeInstanceOf(BatchingProcessor);
  });

  it('should create a new BatchingProcessor instance without options', () => {
    const result = createBatchingProcessor();
    expect(isOk(result)).toEqual(true);
    expect(result.data).toBeInstanceOf(BatchingProcessor);
  });

  it('should return error on invalid option values', () => {
    const result = createBatchingProcessor({
      batchSize: -10,
      concurrency: -2,
    });
    expect(isOk(result)).toEqual(false);
    expect(result.data).toBeInstanceOf(Error);
  });
});
