import { validate } from 'uuid';
import { Job } from '../Job';

describe('Job', () => {
  const jobfnMock = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('when job is idle', () => {
    it('should return the current status of the Job', () => {
      const job = Job.create<string>({
        id: 'test-id',
        jobFn: jobfnMock,
      });
      expect(job.getStatus()).toEqual('idle');
      expect(job.getJobResult()).toEqual({ status: 'idle', id: 'test-id' });
    });
  });

  describe('when job is running', () => {
    it('should run the async function and update the status and result accordingly', async () => {
      const job = Job.create<string>({
        id: 'test-id',
        jobFn: jobfnMock,
      });
      job.run();

      expect(job.getStatus()).toEqual('running');
      expect(job.getJobResult()).toEqual({ status: 'running', id: 'test-id' });
      expect(jobfnMock).toHaveBeenCalledTimes(1);
    });

    it('should result in error on invalid id', async () => {
      const job = Job.create<string>({
        id: 123 as never,
        jobFn: jobfnMock,
      });
      await job.run();

      expect(job.getJobResult()).toEqual({
        status: 'failure',
        id: 123,
        error: expect.objectContaining({
          message: expect.stringContaining('"id": "Expected string, but was number"'),
        }),
      });
    });

    it('should result in error on invalid jobFn', async () => {
      const job = Job.create<string>({
        id: 'job-id-1',
        jobFn: 123 as never,
      });
      await job.run();

      expect(job.getJobResult()).toEqual({
        status: 'failure',
        id: 'job-id-1',
        error: expect.objectContaining({
          message: expect.stringContaining('"jobFn": "Expected function, but was number"'),
        }),
      });
    });
  });

  describe('when job is executed', () => {
    it('should return the result of the Job on success', async () => {
      jobfnMock.mockResolvedValue('job executed successfully');

      const job = Job.create<string>({
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

      const job = Job.create<string>({
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

describe('create Job', () => {
  it('should create a new Job instance with the provided options', () => {
    const jobfnMock = jest.fn();
    const job = Job.create<string>({
      id: 'test-id',
      jobFn: jobfnMock,
    });
    expect(job).toBeInstanceOf(Job);
  });
  it('should create a new Job instance without id', () => {
    const jobfnMock = jest.fn();
    const job = Job.create<string>({
      jobFn: jobfnMock,
    });
    expect(job).toBeInstanceOf(Job);
    expect(validate(job.getJobResult().id)).toEqual(true);
  });
});
