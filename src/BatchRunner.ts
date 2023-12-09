import { PromisePool } from '@supercharge/promise-pool';
import { Ok, Err, Result } from 'rustic';

import { Job } from './Job';
import { BatchRunnerStatus, CreateBatchRunnerOption, FailureJobResult, SuccessJobResult } from './types';
import { CreateBatchProessorOptionValidator } from './validators';

export class BatchRunner {
  private batchSize: number;
  private concurrency: number;
  private status: BatchRunnerStatus = 'idle';
  private jobQueue: Job<unknown>[] = [];
  private successJobs: SuccessJobResult<unknown>[] = [];
  private failedJobs: FailureJobResult[] = [];

  private constructor(option?: CreateBatchRunnerOption) {
    this.batchSize = option?.batchSize ?? 1;
    this.concurrency = option?.concurrency ?? 1;
  }

  getJobStatus() {
    return {
      status: this.status,
      processedJobs: this.successJobs,
      failedJobs: this.failedJobs,
    };
  }

  updateBatchSize(batchSize: number) {
    try {
      if (this.status !== 'idle') {
        throw new Error(`Cannot update 'batchSize' when processor is not in 'idle' status`);
      }

      CreateBatchProessorOptionValidator.pick('batchSize').check({ batchSize });
      this.batchSize = batchSize;
      return Ok(undefined);
    } catch (error) {
      return Err(error);
    }
  }
  updateConcurrency(concurrency: number) {
    try {
      if (this.status !== 'idle') {
        throw new Error(`Cannot update 'concurrency' when processor is not in 'idle' status`);
      }

      CreateBatchProessorOptionValidator.asPartial().check({ concurrency });
      this.concurrency = concurrency;
      return Ok(undefined);
    } catch (error) {
      return Err(error);
    }
  }

  addJob(job: Job<unknown>): Result<unknown, Error> {
    try {
      if (this.status !== 'idle') {
        throw new Error(`Cannot add job when processor is not in 'idle' status`);
      }
      this.jobQueue.push(job);
      return Ok(undefined);
    } catch (error) {
      return Err(error as Error);
    }
  }
  clearJobs() {
    try {
      if (this.status !== 'idle') {
        throw new Error(`Cannot clear job queue when processor is not in 'idle' status`);
      }
      this.jobQueue = [];
      return Ok(undefined);
    } catch (error) {
      return Err(error as Error);
    }
  }
  getJobsCount() {
    return this.jobQueue.length;
  }

  start() {
    try {
      if (this.status !== 'idle') {
        throw new Error(`Processor is not in 'idle' status`);
      }

      this.status = 'running';
      this.run();
      return Ok({ status: this.status });
    } catch (error) {
      return Err(error as Error);
    }
  }
  private async run() {
    const jobQueue = [...this.jobQueue];
    const queue = [];

    // split jobs into batches of batchSize
    while (jobQueue.length > 0) {
      const jobs = jobQueue.splice(0, this.batchSize);
      queue.push(jobs);
    }

    await PromisePool.for(queue)
      .withConcurrency(this.concurrency)
      .onTaskFinished((items) => {
        for (const item of items.map((i) => i.getJobResult())) {
          if (item.status === 'success') {
            this.successJobs.push(item);
          } else if (item.status === 'failure') {
            this.failedJobs.push(item);
          }

          if (this.successJobs.length + this.failedJobs.length === this.jobQueue.length) {
            this.status = 'stopped';
          }
        }
      })
      .process(async (jobs, _index, pool) => {
        if (this.status === 'stopped') {
          return pool.stop();
        }
        const jobResults = await Promise.all(jobs.map((job) => job.run()));
        return jobResults;
      });
  }

  pause() {
    return Err(new Error(`Operation 'pause' is not supported yet`));
  }
  resume() {
    return Err(new Error(`Operation 'resume' is not supported yet`));
  }

  stop() {
    this.status = 'stopped';
    return this.getJobStatus();
  }
  /**
   * Alias of stop().
   */
  shutdown() {
    return this.stop();
  }

  static createBatchRunner(option?: CreateBatchRunnerOption) {
    try {
      if (option) {
        CreateBatchProessorOptionValidator.check(option);
      }
      return Ok(new BatchRunner(option));
    } catch (error) {
      return Err(error as Error);
    }
  }
}
