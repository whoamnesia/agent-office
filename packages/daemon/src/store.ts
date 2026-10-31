import fs from 'node:fs';
import { parseJsonl, stripLocalFields, validateEvents, type OfficeEvent } from '@agent-office/protocol';

/** In-memory ring of recent events plus an append-only JSONL journal on disk. */
export class EventStore {
  private ring: OfficeEvent[] = [];
  private seen = new Set<string>();
  private journalFd: number | undefined;
  private journalBytes = 0;

  constructor(
    private readonly journalFile: string | undefined,
    private readonly capacity = 5000,
    private readonly maxJournalBytes = 20_000_000,
  ) {
    if (journalFile) {
      try {
        this.journalBytes = fs.statSync(journalFile).size;
      } catch {
        this.journalBytes = 0;
      }
    }
  }

  /** Restores the ring from the journal tail (state survives daemon restarts). */
  restore(): number {
    if (!this.journalFile) return 0;
    let text = '';
    try {
      const st = fs.statSync(this.journalFile);
      const len = Math.min(st.size, 4_000_000);
      const fd = fs.openSync(this.journalFile, 'r');
      const buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, st.size - len);
      fs.closeSync(fd);
      text = buf.toString('utf8');
    } catch {
      return 0;
    }
    const { ok } = validateEvents(parseJsonl(text));
    for (const e of ok) this.remember(e);
    return ok.length;
  }

  private remember(e: OfficeEvent): boolean {
    if (this.seen.has(e.id)) return false;
    this.seen.add(e.id);
    this.ring.push(e);
    if (this.ring.length > this.capacity) {
      const drop = this.ring.splice(0, this.ring.length - this.capacity);
      for (const d of drop) this.seen.delete(d.id);
    }
    return true;
  }

  /** Adds events (deduplicated by id); returns the ones that were new. Local-only fields are dropped before storage. */
  add(events: OfficeEvent[], persist = true): OfficeEvent[] {
    const fresh: OfficeEvent[] = [];
    for (const raw of events) {
      const e = stripLocalFields(raw);
      if (this.remember(e)) fresh.push(e);
    }
    if (persist && fresh.length && this.journalFile) this.append(fresh);
    return fresh;
  }

  private append(events: OfficeEvent[]): void {
    try {
      if (this.journalBytes > this.maxJournalBytes) {
        if (this.journalFd !== undefined) fs.closeSync(this.journalFd);
        this.journalFd = undefined;
        fs.renameSync(this.journalFile!, this.journalFile + '.1');
        this.journalBytes = 0;
      }
      this.journalFd ??= fs.openSync(this.journalFile!, 'a');
      const chunk = events.map((e) => JSON.stringify(e)).join('\n') + '\n';
      fs.writeSync(this.journalFd, chunk);
      this.journalBytes += Buffer.byteLength(chunk);
    } catch {
      // disk issues must not take the daemon down
    }
  }

  all(): OfficeEvent[] {
    return this.ring;
  }

  since(ts: number): OfficeEvent[] {
    return this.ring.filter((e) => e.ts >= ts);
  }

  close(): void {
    if (this.journalFd !== undefined) fs.closeSync(this.journalFd);
    this.journalFd = undefined;
  }
}

/** Reads and removes the emitter spool atomically (rename first, so concurrent appends land in a fresh file). */
export function drainSpool(spoolFile: string): OfficeEvent[] {
  const tmp = spoolFile + '.draining';
  try {
    fs.renameSync(spoolFile, tmp);
  } catch {
    return [];
  }
  try {
    return validateEvents(parseJsonl(fs.readFileSync(tmp, 'utf8'))).ok;
  } catch {
    return [];
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}
