import { BatchRunner } from '../';
import { createTimedFailedJob, createTimedJob, wait } from '../__tests__/helpers';

describe('e2e tests', () => {
  it('should complete provided jobs and return processed jobs', async () => {
    const runner = BatchRunner.create<string>({
      batchSize: 2,
      concurrency: 2,
    });

    for (let i = 1; i <= 20; i++) {
      if (i % 3 === 0) {
        // every 3rd job will fail
        runner.addJob(createTimedFailedJob(500, String(i)));
      } else {
        runner.addJob(createTimedJob(500, String(i)));
      }
    }

    expect(runner.getJobsCount()).toEqual(20);

    runner.start();
    const status1 = runner.getBatchRunnerState();
    expect(status1.status).toEqual('running');
    expect(status1.failedJobs.length).toEqual(0);
    expect(status1.processedJobs.length).toEqual(0);

    await wait(5000);
    const status2 = runner.getBatchRunnerState();
    expect(status2.status).toEqual('stopped');
    expect(status2.failedJobs.length).toEqual(6);
    expect(status2.processedJobs.length).toEqual(14);
  });

  it('should return processed jobs upon stopping', async () => {
    const runner = BatchRunner.create<string>({
      batchSize: 2,
      concurrency: 2,
    });

    for (let i = 1; i <= 20; i++) {
      if (i % 3 === 0) {
        // every 3rd job will fail
        runner.addJob(createTimedFailedJob(500, String(i)));
      } else {
        runner.addJob(createTimedJob(500, String(i)));
      }
    }

    expect(runner.getJobsCount()).toEqual(20);

    runner.start();
    const status1 = runner.getBatchRunnerState();
    expect(status1.status).toEqual('running');
    expect(status1.failedJobs.length).toEqual(0);
    expect(status1.processedJobs.length).toEqual(0);

    await wait(2000);
    runner.stop();
    const status2 = runner.getBatchRunnerState();
    expect(status2.status).toEqual('stopped');
    // there should be 12 jobs completed (success or fail) in total
    // only around 2.Xs has passed
    // so 2*2*Math.ceil(2.Xs)=12 jobs should be triggered to complete
    expect(status2.failedJobs.length).toEqual(4);
    expect(status2.processedJobs.length).toEqual(8);
  });

  it('should stop when no jobs are provided', async () => {
    const runner = BatchRunner.create<string>({
      batchSize: 2,
      concurrency: 2,
    });

    expect(runner.getJobsCount()).toEqual(0);

    runner.start();
    const status1 = runner.getBatchRunnerState();

    await wait(1);

    expect(status1.status).toEqual('stopped');
    expect(status1.failedJobs.length).toEqual(0);
    expect(status1.processedJobs.length).toEqual(0);
  });
});
