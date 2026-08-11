export function withRetrievalDeadline(task, timeoutMs, timeoutValue) {
  let timer;
  const deadline = new Promise((resolve) => {
    timer = setTimeout(() => resolve(timeoutValue), timeoutMs);
  });
  return Promise.race([task, deadline]).finally(() => clearTimeout(timer));
}
