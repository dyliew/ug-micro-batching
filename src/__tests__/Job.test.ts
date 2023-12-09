import { validate } from 'uuid';
import { isOk } from 'rustic';
import { Job, createJob } from '../Job';

describe('Job', () => {
  const jobfnMock = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('constructor', () => {
    it('should create a new Job instance with the provided options', () => {
      const job = new Job({
        id: 'test-id',
        jobFn: jobfnMock,
      });
      expect(job).toBeInstanceOf(Job);
    });
    it('should create a new Job instance without id', () => {
      const job = new Job({
        jobFn: jobfnMock,
      });
      expect(job).toBeInstanceOf(Job);
      expect(validate(job.getJobResult().id)).toBe(true);
    });
  });

  describe('when job is idle', () => {
    it('should return the current status of the Job', () => {
      const job = new Job({
        id: 'test-id',
        jobFn: jobfnMock,
      });
      expect(job.getStatus()).toEqual('idle');
      expect(job.getJobResult()).toEqual({ status: 'idle', id: 'test-id' });
    });
  });

  describe('when job is running', () => {
    it('should run the async function and update the status and result accordingly', async () => {
      const job = new Job({
        id: 'test-id',
        jobFn: jobfnMock,
      });
      job.run();

      expect(job.getStatus()).toEqual('running');
      expect(job.getJobResult()).toEqual({ status: 'running', id: 'test-id' });
      expect(jobfnMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('when job is executed', () => {
    it('should return the result of the Job on success', async () => {
      jobfnMock.mockResolvedValue('job executed successfully');

      const job = new Job({
        id: 'test-id',
        jobFn: jobfnMock,
      });
      await job.run();

      expect(job.getStatus()).toEqual('success');
      expect(job.getJobResult()).toEqual({
        status: 'success',
        id: 'test-id',
        result: 'job executed successfully',
      });
      expect(jobfnMock).toHaveBeenCalledTimes(1);
    });

    it('should return the result of the Job on error', async () => {
      jobfnMock.mockRejectedValue(new Error('job executed with error'));

      const job = new Job({
        id: 'test-id',
        jobFn: jobfnMock,
      });
      await job.run();

      expect(job.getStatus()).toEqual('failure');
      expect(job.getJobResult()).toEqual({
        status: 'failure',
        id: 'test-id',
        error: new Error('job executed with error'),
      });
      expect(jobfnMock).toHaveBeenCalledTimes(1);
    });
  });
});

describe('createJob', () => {
  it('should create a new Job instance with the provided options', () => {
    const jobfnMock = jest.fn();
    const jobResult = createJob({
      id: 'test-id',
      jobFn: jobfnMock,
    });
    expect(isOk(jobResult)).toEqual(true);
    expect(jobResult.data).toBeInstanceOf(Job);
  });

  it('should return error on invalid option values', () => {
    const jobResult = createJob({
      id: 'test-id',
      jobFn: undefined as never,
    });
    expect(isOk(jobResult)).toEqual(false);
    expect(jobResult.data).toEqual(
      expect.objectContaining({
        message: expect.stringContaining('"jobFn": "Expected function, but was undefined"'),
      }),
    );
  });
});