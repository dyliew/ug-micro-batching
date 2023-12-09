import { createBatchRunner, createJob } from '..';

describe('index', () => {
  it('should export createBatchRunner', () => {
    expect(createBatchRunner).toBeDefined();
    expect(typeof createBatchRunner === 'function').toBe(true);
  });

  it('should export createJob', () => {
    expect(createJob).toBeDefined();
    expect(typeof createJob === 'function').toBe(true);
  });
});
