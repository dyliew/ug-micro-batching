import { v4 as uuidv4 } from 'uuid';
import { Err, Ok, Result, isOk } from 'rustic';

import { CreateJobOption, JobResult, JobStatus } from './types';
import { CreateJobOptionValidator } from './validators';

/**
 * A class that represents a Job
 */
export class Job<T> {
  private id: string;
  private asyncFn: () => Promise<T>;
  private status: JobStatus = 'idle';
  private result: Result<T, Error> | undefined;

  private constructor(option: CreateJobOption) {
    this.id = option.id ?? uuidv4();
    this.asyncFn = option.jobFn;
  }

  /**
   *
   * @returns the current status of the Job which can be one of the following:
   * - idle
   * - running
   * - success
   * - failure
   */
  getStatus() {
    return this.status;
  }

  /**
   * An async function that updates the status of the Job to running and executes the async function
   * @returns the result of the async function on success or the error on failure
   */
  async run() {
    this.status = 'running';

    try {
      const result = await this.asyncFn();
      this.result = Ok(result);
      this.status = 'success';

      return result;
    } catch (error) {
      this.status = 'failure';
      this.result = Err(error as Error);

      return this.result;
    }
  }

  /**
   * @returns the result of the Job if the Job depends on the status of the Job
   * - status === 'success' then the result contains the data returned by the async function
   * - status === 'failure' then the result contains the error thrown by the async function
   */
  getJobResult(): JobResult<T> {
    if (this.status === 'success' && this.result && isOk(this.result)) {
      return { id: this.id, status: this.status, result: this.result.data };
    }
    if (this.status === 'failure' && this.result && !isOk(this.result)) {
      return { id: this.id, status: this.status, error: this.result.data };
    }
    if (this.status === 'idle' || this.status === 'running') {
      return { id: this.id, status: this.status };
    }
    // TOOD: this condition will never be met, refactor the code for better type safety
    return {
      id: this.id,
      status: 'failure',
      error: new Error(`Unhandled status and result combination. Status: ${this.status}, Result: ${this.result}`),
    };
  }

  /**
   * @returns an instance of Job if the option is valid, otherwise returns an error
   */
  static create<T>(option: CreateJobOption) {
    try {
      CreateJobOptionValidator.check(option);
      return Ok(new Job<T>(option));
    } catch (error) {
      return Err(error);
    }
  }
}
