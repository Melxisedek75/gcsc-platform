export function shouldClearAppSession(error) {
  const status = error && typeof error === 'object' ? error.status : undefined;
  return status === 401 || status === 403 || status === 404;
}
