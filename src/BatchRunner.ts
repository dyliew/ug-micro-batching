import { PromisePool } from '@supercharge/promise-pool';
import { Ok, Err, Result } from 'rustic';

import { Job } from './Job';
import {
  BatchRunnerState,
  BatchRunnerStatus,
  CreateBatchRunnerOption,
  FailureJobResult,
  SuccessJobResult,
} from './types';
import { CreateBatchProessorOptionValidator } from './validators';

/**
 * A class that represents a BatchRunner
 * It uses @supercharge/promise-pool as the BatchProcessor to run jobs in batches
 */
export class BatchRunner<T> {
  private batchSize: number;
  private concurrency: number;
  private status: BatchRunnerStatus = 'idle';
  private jobQueue: Job<T>[] = [];
  private successJobs: SuccessJobResult<T>[] = [];
  private failedJobs: FailureJobResult[] = [];

  private onStoppedCallback?: (state: BatchRunnerState<T>) => void;

  private constructor(option?: CreateBatchRunnerOption) {
    this.batchSize = option?.batchSize ?? 1;
    this.concurrency = option?.concurrency ?? 1;
  }

  /**
   * @returns the current status of the BatchRunner which also contains processed and failed jobs
   */
  getBatchRunnerState() {
    return {
      status: this.status,
      processedJobs: this.successJobs,
      failedJobs: this.failedJobs,
    };
  }

  /**
   * Updates the batchSize of the BatchRunner
   * @param batchSize
   * @returns an error if status is not 'idle' or batchSize input is invalid
   */
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
  /**
   * Updates the concurrency of the BatchRunner
   * @param concurrency
   * @returns an error if status is not 'idle' or concurrency input is invalid
   */
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

  /**
   * Append a job to the job queue
   * @param job
   * @returns an error if status is not 'idle'
   */
  addJob(job: Job<T>): Result<unknown, Error> {
    try {
      if (this.status !== 'idle') {
        throw new Error(`Cannot add job when processor is not in 'idle' status`);
      }
      this.jobQueue.push(job);
      return Ok(job.getJobResult());
    } catch (error) {
      return Err(error as Error);
    }
  }
  /**
   * Remove all jobs from the job queue
   * @param jobs
   * @returns an error if status is not 'idle'
   */
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
  /**
   * @returns the number of jobs in the job queue
   */
  getJobsCount() {
    return this.jobQueue.length;
  }

  /**
   * Updates BatchRunner status to 'running' and starts running the jobs in the job queue.
   * Jobs are run in batches of batchSize.
   * Batches are run concurrently with concurrency value provided.
   * @returns an error if status is not 'idle'
   */
  start() {
    try {
      if (this.status !== 'idle') {
        throw new Error(`Processor is not in 'idle' status`);
      }

      if (this.jobQueue.length === 0) {
        this.status = 'stopped';
        this.onStoppedCallback?.(this.getBatchRunnerState());
      } else {
        this.status = 'running';
        this.run();
      }

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
            this.onStoppedCallback?.(this.getBatchRunnerState());
          }
        }
      })
      .process(async (jobs, _index, pool) => {
        if (this.status === 'stopped') {
          return pool.stop();
        } else {
          const jobResults = await Promise.all(jobs.map((job) => job.run()));
          return jobResults;
        }
      });
  }

  /**
   * NOT IMPLEMENTED YET
   */
  pause() {
    return Err(new Error(`Operation 'pause' is not supported yet`));
  }
  /**
   * NOT IMPLEMENTED YET
   */
  resume() {
    return Err(new Error(`Operation 'resume' is not supported yet`));
  }

  /**
   * Updates the status of the BatchRunner to 'stopped'.
   * Jobs that are not yet run will not be run.
   * @returns the current status of the BatchRunner
   */
  stop() {
    if (this.status !== 'stopped') {
      this.status = 'stopped';
      this.onStoppedCallback?.(this.getBatchRunnerState());
    }
    return this.getBatchRunnerState();
  }
  /**
   * Alias of stop().
   * @returns the current status of the BatchRunner
   */
  shutdown() {
    return this.stop();
  }

  onStopped(callback: (state: BatchRunnerState<T>) => void) {
    this.onStoppedCallback = callback;
  }

  /**
   * @returns an instance of BatchRunner if the option is valid, otherwise returns an error
   */
  static create<T>(option?: CreateBatchRunnerOption) {
    try {
      if (option) {
        CreateBatchProessorOptionValidator.check(option);
      }
      return Ok(new BatchRunner<T>(option));
    } catch (error) {
      return Err(error as Error);
    }
  }
}
