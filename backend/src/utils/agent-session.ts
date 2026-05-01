import type { Response } from 'express';
import type { AgentEvent, AgentEventType, AgentId } from '../api/ocr/ocr.types';

type EmitInput = Omit<AgentEvent, 'seq' | 't'>;

/**
 * AgentSession — a shared event bus for the multi-agent pipeline.
 *
 * Every agent receives the session and calls session.emit() as it works.
 * The session can either:
 *  - pipe()  → stream events live over SSE to an Express Response
 *  - getLog() → return all collected events as a batch (for DB persistence)
 */
export class AgentSession {
  private events: AgentEvent[] = [];
  private seq = 0;
  private startedAt = Date.now();
  private res: Response | null = null;

  /** Attach an SSE Response — all subsequent emit() calls stream live. */
  pipe(res: Response): void {
    this.res = res;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
  }

  /** Record an event — streams it if piped, always appends to log. */
  emit(input: EmitInput): AgentEvent {
    const event: AgentEvent = {
      seq: ++this.seq,
      t: Date.now() - this.startedAt,
      ...input,
    };

    this.events.push(event);

    if (this.res && !this.res.writableEnded) {
      this.res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    return event;
  }

  /** Convenience: emit a PIPELINE_START system event. */
  start(message = 'Multi-agent pipeline initiated'): void {
    this.emit({ agent: 'system', type: 'PIPELINE_START', message });
  }

  /** Convenience: emit PIPELINE_COMPLETE with final payload. */
  complete(payload: unknown): void {
    this.emit({ agent: 'system', type: 'PIPELINE_COMPLETE', message: 'Pipeline finished', payload });
    if (this.res && !this.res.writableEnded) {
      this.res.end();
    }
  }

  /** Convenience: emit PIPELINE_ERROR and close the stream. */
  error(message: string, agent: AgentId = 'system'): void {
    this.emit({ agent, type: 'PIPELINE_ERROR', message });
    if (this.res && !this.res.writableEnded) {
      this.res.end();
    }
  }

  /** Return all recorded events (for DB persistence). */
  getLog(): AgentEvent[] {
    return this.events;
  }

  /** Close the SSE stream without emitting a final event. */
  close(): void {
    if (this.res && !this.res.writableEnded) {
      this.res.end();
    }
  }
}
