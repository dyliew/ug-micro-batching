import { Record, Number, String } from 'runtypes';

// createBatchProessorOption
export const CreateBatchProessorOptionValidator = Record({
  batchSize: Number.withConstraint(
    (n) => (n > 0 && n <= 1000) || `'batchSize' must be between 1-1000 inclusive`,
  ).optional(),
  concurrency: Number.withConstraint(
    (n) => (n > 0 && n <= 1000) || `'batchSize' must be between 1-1000 inclusive`,
  ).optional(),
});

export const CreateJobOptionBaseValidator = Record({
  id: String.optional(),
});
