import { Static } from 'runtypes';

import { CreateJobOptionBaseValidator, CreateBatchProessorOptionValidator } from './validators';

export type CreateBatchProessorOption = Static<typeof CreateBatchProessorOptionValidator>;

export type JobStatus = 'idle' | 'running' | 'success' | 'failure' | 'cancelled';

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

export type CreateJobOption = Static<typeof CreateJobOptionBaseValidator> & {
  jobFn: <T>() => Promise<T>;
};

export type BatchingProcessorStatus = 'idle' | 'running' | 'stopped';