import { createBatchRunner } from '../';
import { BatchRunner } from '../BatchRunner';
import { Job } from '../Job';
import { createTimedFailedJob, createTimedJob, wait } from '../__tests__/helpers';

describe('e2e tests', () => {
  it('should complete provided jobs and return processed jobs', async () => {
    const processor = createBatchRunner({
      batchSize: 2,
      concurrency: 2,
    }).data as BatchRunner;

    for (let i = 1; i <= 20; i++) {
      if (i % 3 === 0) {
        processor.addJob(createTimedFailedJob(500, String(i)).data as Job<unknown>);
      } else {
        processor.addJob(createTimedJob(500, String(i)).data as Job<unknown>);
      }
    }

    expect(processor.getJobsCount()).toEqual(20);

    processor.start();
    const status1 = processor.getJobStatus();
    expect(status1.status).toEqual('running');
    expect(status1.failedJobs.length).toEqual(0);
    expect(status1.processedJobs.length).toEqual(0);

    await wait(5000);
    const status2 = processor.getJobStatus();
    expect(status2.status).toEqual('stopped');
    expect(status2.failedJobs.length).toEqual(6);
    expect(status2.processedJobs.length).toEqual(14);
  });

  it('should return processed jobs upon stopping', async () => {
    const processor = createBatchRunner({
      batchSize: 2,
      concurrency: 2,
    }).data as BatchRunner;

    for (let i = 1; i <= 20; i++) {
      if (i % 3 === 0) {
        processor.addJob(createTimedFailedJob(500, String(i)).data as Job<unknown>);
      } else {
        processor.addJob(createTimedJob(500, String(i)).data as Job<unknown>);
      }
    }

    expect(processor.getJobsCount()).toEqual(20);

    processor.start();
    const status1 = processor.getJobStatus();
    expect(status1.status).toEqual('running');
    expect(status1.failedJobs.length).toEqual(0);
    expect(status1.processedJobs.length).toEqual(0);

    await wait(2000);
    processor.stop();
    const status2 = processor.getJobStatus();
    expect(status2.status).toEqual('stopped');
    // there should be 12 jobs completed (success or fail) in total
    // only around 2.Xs has passed
    // so 2*2*Math.ceil(2.Xs)=12 jobs should be triggered to complete
    expect(status2.failedJobs.length).toEqual(4);
    expect(status2.processedJobs.length).toEqual(8);
  });
});
