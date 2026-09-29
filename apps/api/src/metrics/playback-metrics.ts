type Policy = 'public' | 'signed'

const issuedCounters: Record<Policy, number> = {
  public: 0,
  signed: 0,
}

const errorCounters = new Map<string, number>()

const latencies: number[] = []

export function recordPlaybackIssued(policy: Policy) {
  issuedCounters[policy] += 1
}

export function recordPlaybackError(code: string) {
  errorCounters.set(code, (errorCounters.get(code) || 0) + 1)
}

export function recordPlaybackLatency(ms: number) {
  if (!Number.isFinite(ms)) return
  latencies.push(ms)
  if (latencies.length > 1_000) latencies.splice(0, latencies.length - 1_000)
}

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
  return sorted[index]
}

export function snapshotMetrics() {
  return {
    issued: { ...issuedCounters },
    errors: Object.fromEntries(errorCounters.entries()),
    latencyP95: percentile(latencies, 95),
  }
}

export function resetMetrics() {
  issuedCounters.public = 0
  issuedCounters.signed = 0
  errorCounters.clear()
  latencies.length = 0
}
