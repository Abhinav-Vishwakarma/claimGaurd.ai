import { motion, AnimatePresence } from 'framer-motion';

interface DataPacketProps {
  active: boolean;
  label?: string;
  color?: string;
}

/**
 * An animated "file packet" that slides between two agent nodes.
 * Sits inside the connector arrow between nodes.
 */
export function DataPacket({ active, label = '📄', color = '#6366f1' }: DataPacketProps) {
  return (
    <div className="relative flex items-center justify-center w-16 h-8 overflow-visible">
      {/* Static arrow line */}
      <div className="absolute inset-0 flex items-center">
        <div className="w-full h-px bg-[var(--color-border)]" />
      </div>

      {/* Arrow head */}
      <div className="absolute right-0 w-0 h-0 border-t-4 border-b-4 border-l-6 border-transparent"
        style={{ borderLeftColor: 'var(--color-border)' }}
      />

      {/* Animated packet */}
      <AnimatePresence>
        {active && (
          <motion.div
            key="packet"
            initial={{ x: -28, opacity: 0, scale: 0.6 }}
            animate={{ x: 28, opacity: 1, scale: 1 }}
            exit={{ x: 28, opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.6, ease: 'easeInOut', repeat: Infinity }}
            className="absolute z-10 flex items-center justify-center w-7 h-7 rounded-lg text-base shadow-lg"
            style={{ background: `${color}25`, border: `1.5px solid ${color}`, boxShadow: `0 0 10px ${color}60` }}
          >
            <span className="text-xs">{label}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
