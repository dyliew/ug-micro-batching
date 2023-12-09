import { BatchRunner, Job } from '..';

describe('index', () => {
  it('should export BatchRunner', () => {
    expect(BatchRunner).toBeDefined();
    expect(typeof BatchRunner.createBatchRunner === 'function').toBe(true);
  });

  it('should export Job', () => {
    expect(Job).toBeDefined();
    expect(typeof Job.createJob === 'function').toBe(true);
  });
});
