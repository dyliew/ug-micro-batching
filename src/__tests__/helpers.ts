import { Job } from '../Job';

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const createTimedJob = <T>(time: number, id?: string) => {
  return Job.create<T>({
    id,
    jobFn: () => new Promise((resolve) => setTimeout(() => resolve(id), time)),
  });
};
export const createTimedFailedJob = <T>(time: number, id?: string) => {
  return Job.create<T>({
    id,
    jobFn: () => new Promise((_resolve, reject) => setTimeout(() => reject(new Error(id)), time)),
  });
};
