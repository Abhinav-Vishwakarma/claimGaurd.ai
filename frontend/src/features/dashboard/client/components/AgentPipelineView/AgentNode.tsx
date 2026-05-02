import { motion, AnimatePresence } from 'framer-motion';
import type { AgentId, AgentState } from './pipeline.types';
import { AGENT_META } from './pipeline.types';

interface AgentNodeProps {
  agentId: Exclude<AgentId, 'system'>;
  state: AgentState;
  activeTool?: string | null;
}

const STATE_STYLES: Record<AgentState, { border: string; glow: string; bg: string; badge: string; badgeText: string }> = {
  idle: {
    border: 'border-[var(--color-border)]',
    glow: '',
    bg: 'bg-[var(--color-surface)]',
    badge: 'bg-[var(--color-soft)] text-[var(--color-muted)]',
    badgeText: 'Idle',
  },
  active: {
    border: 'border-blue-500',
    glow: 'shadow-[0_0_20px_rgba(99,102,241,0.35)]',
    bg: 'bg-[var(--color-surface)]',
    badge: 'bg-blue-500/20 text-blue-400',
    badgeText: 'Active',
  },
  thinking: {
    border: 'border-indigo-400',
    glow: 'shadow-[0_0_24px_rgba(99,102,241,0.4)]',
    bg: 'bg-[var(--color-surface)]',
    badge: 'bg-indigo-500/20 text-indigo-400',
    badgeText: 'Thinking...',
  },
  tool_calling: {
    border: 'border-amber-400',
    glow: 'shadow-[0_0_24px_rgba(245,158,11,0.4)]',
    bg: 'bg-[var(--color-surface)]',
    badge: 'bg-amber-500/20 text-amber-400',
    badgeText: 'Calling Tool',
  },
  done: {
    border: 'border-emerald-500',
    glow: 'shadow-[0_0_16px_rgba(16,185,129,0.25)]',
    bg: 'bg-[var(--color-surface)]',
    badge: 'bg-emerald-500/20 text-emerald-400',
    badgeText: '✓ Done',
  },
  error: {
    border: 'border-red-500',
    glow: 'shadow-[0_0_20px_rgba(239,68,68,0.35)]',
    bg: 'bg-[var(--color-surface)]',
    badge: 'bg-red-500/20 text-red-400',
    badgeText: '✗ Error',
  },
};

export function AgentNode({ agentId, state, activeTool }: AgentNodeProps) {
  const meta = AGENT_META[agentId];
  const styles = STATE_STYLES[state];
  const isActive = state === 'active' || state === 'thinking' || state === 'tool_calling';

  return (
    <motion.div
      layout
      className={`h-full flex flex-col relative rounded-2xl border-2 p-5 transition-colors duration-300 ${styles.border} ${styles.glow} ${styles.bg}`}
      animate={{ scale: isActive ? 1.05 : 1 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {/* Animated background pulse for active state */}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-2xl opacity-10"
          style={{ background: meta.color }}
          animate={{ opacity: [0.05, 0.15, 0.05] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
        />
      )}

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <motion.span
              className="text-3xl"
              animate={state === 'thinking' ? { rotate: [0, -10, 10, 0] } : {}}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              {meta.icon}
            </motion.span>
            <div>
              <p className="font-bold text-sm leading-tight">{meta.name}</p>
              <p className="text-[10px] text-[var(--color-muted)] leading-tight mt-0.5">{meta.description}</p>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${styles.badge}`}>
            {styles.badgeText}
          </span>
        </div>

        <div className="mt-auto pt-4">
          {/* Thinking dots */}
        <AnimatePresence>
          {state === 'thinking' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex gap-1.5 items-center mt-2"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{ background: meta.color }}
                  animate={{ y: [0, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.15 }}
                />
              ))}
              <span className="text-[10px] text-[var(--color-muted)] ml-1">Processing...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active tool indicator */}
        <AnimatePresence>
          {state === 'tool_calling' && activeTool && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mt-2 flex items-center gap-2 text-[10px] text-amber-400 font-medium"
            >
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              >
                ⚡
              </motion.span>
              {activeTool.replace(/_/g, ' ')}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Done checkmark flash */}
        <AnimatePresence>
          {state === 'done' && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-2 text-emerald-400 text-xs font-semibold"
            >
              Validation complete
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
