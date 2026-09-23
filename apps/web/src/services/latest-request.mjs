export function createLatestRequestGate() {
  let latestRequestId = 0

  return {
    start() {
      latestRequestId += 1
      return latestRequestId
    },
    isCurrent(requestId) {
      return requestId === latestRequestId
    },
    invalidate() {
      latestRequestId += 1
    },
  }
}
