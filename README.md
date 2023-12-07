# Micro-batching library

Micro-batching is a technique used in processing pipelines where individual tasks are grouped together into small batches.
This can improve throughput by reducing the number of requests made to a downstream system.
Your task is to implement a micro-batching library, with the following requirements:

- it should allow the caller to submit a single Job, and it should return a JobResult
- it should process accepted Jobs in batches using a BatchProcessor
  - Don't implement BatchProcessor. This should be a dependency of your library.
- it should provide a way to configure the batching behaviour i.e. size and frequency
- it should expose a shutdown method which returns after all previously accepted Jobs are
  processed
