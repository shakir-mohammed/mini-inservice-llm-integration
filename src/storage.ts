import type { IngestEvent } from './schemas.js'

type StoredEvent = IngestEvent & { received_at: number }

export class EventStore {
  private events: StoredEvent[] = []

  add(ev: IngestEvent) {
    const received_at = Date.now()
    this.events.push({ ...ev, received_at })
    this.compact()
  }

  // count events for customer in last N minutes */
  countLastMinutes(customerId: string, minutes: number) {
    const cutoff = Date.now() - minutes * 60_000
    let count = 0
    let lastEventAt: string | null = null

    for (const e of this.events) {
      if (e.customer_id !== customerId) continue
      const ts = Date.parse(e.timestamp)
      if (Number.isNaN(ts)) continue
      if (ts >= cutoff) count++
      if (!lastEventAt || ts > Date.parse(lastEventAt))
        lastEventAt = e.timestamp
    }

    return { count, lastEventAt }
  }

  // remove old events to keep memory bounded */
  compact() {
    const keepSince = Date.now() - 24 * 60 * 60_000 // keep 24h
    // We compact on write only: ok for small traffic
    this.events = this.events.filter(
      (e) => Date.parse(e.timestamp) >= keepSince,
    )
  }

  size() {
    return this.events.length
  }
}
