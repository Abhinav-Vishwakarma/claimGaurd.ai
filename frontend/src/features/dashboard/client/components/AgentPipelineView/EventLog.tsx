import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AgentEvent, AgentId } from './pipeline.types';
import { AGENT_META, TOOL_META } from './pipeline.types';

interface EventLogProps {
  events: AgentEvent[];
  bufferedEvents?: number;
  receivedEvents?: number;
}

const EVENT_ICONS: Record<string, string> = {
  PIPELINE_START: '>>',
  AGENT_STARTED: '>',
  AGENT_THINKING: '...',
  TOOL_CALL: '->',
  TOOL_RESULT: '<-',
  AGENT_OUTPUT: 'OK',
  AGENT_HANDOFF: '=>',
  PIPELINE_COMPLETE: 'END',
  PIPELINE_ERROR: 'XX',
};

const EVENT_COLORS: Record<string, string> = {
  PIPELINE_START: 'text-[var(--color-primary)]',
  AGENT_STARTED: 'text-blue-400',
  AGENT_THINKING: 'text-indigo-400',
  TOOL_CALL: 'text-amber-400',
  TOOL_RESULT: 'text-amber-300',
  AGENT_OUTPUT: 'text-emerald-400',
  AGENT_HANDOFF: 'text-purple-400',
  PIPELINE_COMPLETE: 'text-emerald-400',
  PIPELINE_ERROR: 'text-red-400',
};

const getAgentLabel = (agentId: AgentId): string => {
  if (agentId === 'system') return 'System';
  return AGENT_META[agentId]?.name ?? agentId;
};

const getToolLabel = (tool?: string): string => {
  if (!tool) return '';
  return TOOL_META[tool]?.label ?? tool.replace(/_/g, ' ');
};

const formatTime = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

export function EventLog({ events, bufferedEvents = 0, receivedEvents = events.length }: EventLogProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [events.length]);

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-soft)]">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
          Delayed Agent Log
        </span>
        <span className="ml-auto text-xs text-[var(--color-muted)]">
          {events.length}/{receivedEvents} shown
        </span>
        <span className="text-xs text-[var(--color-muted)]">
          {bufferedEvents > 0 ? `${bufferedEvents} queued` : 'live'}
        </span>
      </div>

      <div
        ref={containerRef}
        className="h-64 overflow-y-auto p-3 space-y-1 custom-scrollbar font-mono text-xs"
      >
        {events.length === 0 && (
          <div className="flex items-center justify-center h-full text-[var(--color-muted)]">
            Waiting for pipeline to start...
          </div>
        )}

        <AnimatePresence initial={false}>
          {events.map((event) => (
            <motion.div
              key={event.seq}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-2 py-0.5"
            >
              <span className="text-[var(--color-muted)] w-12 flex-shrink-0 pt-0.5">
                {formatTime(event.t)}
              </span>

              <span className={`flex-shrink-0 w-8 text-center ${EVENT_COLORS[event.type] ?? 'text-[var(--color-muted)]'}`}>
                {EVENT_ICONS[event.type] ?? '..'}
              </span>

              <div className="flex-1 min-w-0">
                <span className={`font-semibold ${EVENT_COLORS[event.type] ?? ''}`}>
                  [{getAgentLabel(event.agent)}]
                </span>
                {event.tool && (
                  <span className="text-amber-500 ml-1">
                    ({getToolLabel(event.tool)})
                  </span>
                )}
                {event.message && (
                  <span className="text-[var(--color-text)] ml-1 break-all">{event.message}</span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
