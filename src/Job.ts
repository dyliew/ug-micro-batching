import { v4 as uuidv4 } from 'uuid';
import { Err, Ok, Result, isOk } from 'rustic';

import { CreateJobOption, JobResult, JobStatus } from './types';
import { CreateJobOptionValidator } from './validators';

export class Job<T> {
  private id: string;
  private asyncFn: () => Promise<T>;
  private status: JobStatus = 'idle';
  private result: Result<T, Error> | undefined;

  private constructor(option: CreateJobOption) {
    this.id = option.id ?? uuidv4();
    this.asyncFn = option.jobFn;
  }

  getStatus() {
    return this.status;
  }

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

  static createJob(option: CreateJobOption) {
    try {
      CreateJobOptionValidator.check(option);
      return Ok(new Job(option));
    } catch (error) {
      return Err(error);
    }
  }
}
