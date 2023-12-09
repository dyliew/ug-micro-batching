import { CreateBatchProessorOptionValidator, CreateJobOptionValidator } from './validators';

describe('CreateBatchProessorOptionValidator', () => {
  it('should validate valid batch processor options', () => {
    const validOptions = {
      batchSize: 100,
      concurrency: 5,
    };

    const result = CreateBatchProessorOptionValidator.check(validOptions);
    expect(result).toEqual(validOptions);
  });

  it('should throw an error for invalid batch size', () => {
    const invalidOptions = {
      batchSize: 0,
      concurrency: 5,
    };

    expect(() => CreateBatchProessorOptionValidator.check(invalidOptions)).toThrow(
      expect.objectContaining({
        message: expect.stringContaining(`'batchSize' must be between 1-1000 inclusive`),
      }),
    );
  });

  it('should throw an error for invalid concurrency', () => {
    const invalidOptions = {
      batchSize: 100,
      concurrency: 0,
    };

    expect(() => CreateBatchProessorOptionValidator.check(invalidOptions)).toThrow(
      expect.objectContaining({
        message: expect.stringContaining(`'concurrency' must be between 1-1000 inclusive`),
      }),
    );
  });
});

describe('CreateJobOptionValidator', () => {
  it('should validate valid job options', () => {
    const validOptions = {
      id: 'job1',
      jobFn: () => {},
    };

    const result = CreateJobOptionValidator.check(validOptions);
    expect(result).toEqual(validOptions);
  });

  it('should throw an error for missing job function', () => {
    const invalidOptions = {
      id: 'job1',
    };

    expect(() => CreateJobOptionValidator.check(invalidOptions)).toThrow(
      expect.objectContaining({
        message: expect.stringContaining(`\"jobFn\": \"Expected function, but was missing\"`),
      }),
    );
  });
});
