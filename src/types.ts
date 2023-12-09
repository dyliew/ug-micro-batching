import { Static } from 'runtypes';

import { CreateJobOptionValidator, CreateBatchProessorOptionValidator } from './validators';

export type CreateBatchRunnerOption = Static<typeof CreateBatchProessorOptionValidator>;

export type JobStatus = 'idle' | 'running' | 'success' | 'failure';

export interface SuccessJobResult<T> {
  id: string;
  status: 'success';
  result: T;
}
export interface FailureJobResult {
  id: string;
  status: 'failure';
  error?: Error;
}
export interface OtherJobResult {
  id: string;
  status: 'idle' | 'running' | 'cancelled';
}
export type JobResult<T> = SuccessJobResult<T> | OtherJobResult | FailureJobResult;

export type CreateJobOption = Static<typeof CreateJobOptionValidator>;

export type BatchRunnerStatus = 'idle' | 'running' | 'stopped';
