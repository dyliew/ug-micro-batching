import { PromisePool } from '@supercharge/promise-pool';
import { Ok, Err, Result } from 'rustic';

import { JobType } from './Job';
import { BatchingProcessorStatus, CreateBatchProessorOption, FailureJobResult, SuccessJobResult } from './types';
import { CreateBatchProessorOptionValidator } from './validators';

class BatchingProcessor {
  private batchSize: number;
  private concurrency: number;
  private status: BatchingProcessorStatus = 'idle';
  private jobQueue: JobType<unknown>[] = [];
  private successJobs: SuccessJobResult<unknown>[] = [];
  private failedJobs: FailureJobResult[] = [];

  constructor(option: CreateBatchProessorOption) {
    const validatedOption = CreateBatchProessorOptionValidator.check(option);

    this.batchSize = validatedOption.batchSize ?? 1;
    this.concurrency = validatedOption.concurrency ?? 1;
  }

  getStatus() {
    return this.status;
  }

  updateBatchSize(batchSize: number) {
    try {
      if (this.status !== 'idle') {
        throw new Error(`Cannot update 'batchSize' when processor is not in 'idle' status`);
      }

      CreateBatchProessorOptionValidator.asPartial().check({ batchSize });
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

  addJobs(...jobs: JobType<unknown>[]): Result<unknown, Error>[] {
    return jobs.map((job) => this.addJob(job));
  }
  addJob(job: JobType<unknown>): Result<unknown, Error> {
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
    this.jobQueue = [];
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
    throw new Error(`Operation 'pause' is not supported yet`);
  }
  resume() {
    throw new Error(`Operation 'resume' is not supported yet`);
  }

  stop() {
    this.status = 'stopped';

    return {
      status: this.status,
      processedJobs: this.successJobs,
      failedJobs: this.failedJobs,
    };
  }
  /**
   * Alias of stop().
   */
  shutdown() {
    return this.stop();
  }
}

export const createBatchingProcessor = (option: CreateBatchProessorOption) => {
  try {
    CreateBatchProessorOptionValidator.check(option);
    return Ok(new BatchingProcessor(option));
  } catch (error) {
    return Err(error);
  }
};
