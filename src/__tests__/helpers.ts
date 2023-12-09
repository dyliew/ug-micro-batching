import { Job } from '../Job';

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const createTimedJob = (time: number, id?: string) => {
  return Job.create({
    id,
    jobFn: () => new Promise((resolve) => setTimeout(() => resolve(id), time)),
  });
};
export const createTimedFailedJob = (time: number, id?: string) => {
  return Job.create({
    id,
    jobFn: () => new Promise((_resolve, reject) => setTimeout(() => reject(new Error(id)), time)),
  });
};
