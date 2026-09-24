export interface LatestRequestGate {
  start(): number
  isCurrent(requestId: number): boolean
  invalidate(): void
}

export function createLatestRequestGate(): LatestRequestGate
