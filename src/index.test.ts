import { createBatchingProcessor, createJob } from './';

describe('index', () => {
  it('should export createBatchingProcessor', () => {
    expect(createBatchingProcessor).toBeDefined();
    expect(typeof createBatchingProcessor === 'function').toBe(true);
  });

  it('should export createJob', () => {
    expect(createJob).toBeDefined();
    expect(typeof createJob === 'function').toBe(true);
  });
});
