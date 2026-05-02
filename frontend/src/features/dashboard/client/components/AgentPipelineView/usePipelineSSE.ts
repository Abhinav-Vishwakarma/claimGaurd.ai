import { useState, useRef, useCallback } from 'react';
import { getAccessToken } from '../../../../../lib/authStorage';
import type {
  AgentEvent,
  AgentId,
  AgentState,
  FinalPipelineResult,
  PipelineStatus,
} from './pipeline.types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// Minimum delay between event playback steps (ms) — for smooth animation
const MIN_EVENT_DELAY = 350;

export interface PipelineState {
  status: PipelineStatus;
  events: AgentEvent[];
  agentStates: Record<AgentId, AgentState>;
  activeAgent: AgentId | null;
  activeTool: string | null;
  finalResult: FinalPipelineResult | null;
  error: string | null;
}

const initialAgentStates: Record<AgentId, AgentState> = {
  system: 'idle',
  agent_1: 'idle',
  agent_2: 'idle',
  agent_3: 'idle',
  agent_4: 'idle',
};

const deriveAgentState = (event: AgentEvent, current: AgentState): AgentState => {
  switch (event.type) {
    case 'AGENT_STARTED': return 'active';
    case 'AGENT_THINKING': return 'thinking';
    case 'TOOL_CALL': return 'tool_calling';
    case 'TOOL_RESULT':
    case 'AGENT_HANDOFF': return 'active';
    case 'AGENT_OUTPUT':
      return 'done';
    case 'PIPELINE_ERROR': return 'error';
    default: return current;
  }
};

export function usePipelineSSE() {
  const [state, setState] = useState<PipelineState>({
    status: 'idle',
    events: [],
    agentStates: { ...initialAgentStates },
    activeAgent: null,
    activeTool: null,
    finalResult: null,
    error: null,
  });

  const eventQueue = useRef<AgentEvent[]>([]);
  const isPlaying = useRef(false);

  // Controlled playback — drain queue with min delay for animation
  const playNextEvent = useCallback(() => {
    if (eventQueue.current.length === 0) {
      isPlaying.current = false;
      return;
    }

    const event = eventQueue.current.shift()!;

    setState((prev) => {
      const newAgentStates = { ...prev.agentStates };
      if (event.agent !== 'system') {
        newAgentStates[event.agent] = deriveAgentState(event, prev.agentStates[event.agent]);
      }

      // On pipeline error — flip every in-progress agent to error state so
      // the UI clearly shows which agents were halted mid-execution
      if (event.type === 'PIPELINE_ERROR') {
        (Object.keys(newAgentStates) as AgentId[]).forEach((id) => {
          if (newAgentStates[id] !== 'idle' && newAgentStates[id] !== 'done') {
            newAgentStates[id] = 'error';
          }
        });
      } else if (event.type === 'PIPELINE_COMPLETE') {
        (Object.keys(newAgentStates) as AgentId[]).forEach((id) => {
          if (newAgentStates[id] !== 'idle') {
            newAgentStates[id] = 'done';
          }
        });
      }

      let activeTool = prev.activeTool;
      if (event.type === 'TOOL_CALL') activeTool = event.tool ?? null;
      if (event.type === 'TOOL_RESULT' || event.type === 'PIPELINE_ERROR') activeTool = null;

      let finalResult = prev.finalResult;
      if (event.type === 'PIPELINE_COMPLETE' && event.payload) {
        finalResult = event.payload as FinalPipelineResult;
      }

      return {
        ...prev,
        events: [...prev.events, event],
        agentStates: newAgentStates,
        activeAgent: event.type === 'PIPELINE_ERROR' ? null : event.agent !== 'system' ? event.agent : prev.activeAgent,
        activeTool,
        finalResult,
        status: event.type === 'PIPELINE_COMPLETE'
          ? 'complete'
          : event.type === 'PIPELINE_ERROR'
            ? 'error'
            : 'running',
        error: event.type === 'PIPELINE_ERROR' ? (event.message ?? 'Unknown error') : prev.error,
      };
    });


    setTimeout(playNextEvent, MIN_EVENT_DELAY);
  }, []);

  const enqueueEvent = useCallback((event: AgentEvent) => {
    eventQueue.current.push(event);
    if (!isPlaying.current) {
      isPlaying.current = true;
      playNextEvent();
    }
  }, [playNextEvent]);

  const startPipeline = useCallback(async (payload: {
    prescriptionVaultId: string;
    billVaultId: string;
    labReportVaultId: string;
  }) => {
    // Reset state
    eventQueue.current = [];
    isPlaying.current = false;
    setState({
      status: 'running',
      events: [],
      agentStates: { ...initialAgentStates },
      activeAgent: null,
      activeTool: null,
      finalResult: null,
      error: null,
    });

    try {
      const token = getAccessToken();
      const response = await fetch(`${API_URL}/dashboard/ocr/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.message || `Server error ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event: AgentEvent = JSON.parse(line.slice(6));
              enqueueEvent(event);
            } catch {
              // malformed line — skip
            }
          }
        }
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: (err as Error).message || 'Failed to connect to pipeline',
      }));
    }
  }, [enqueueEvent]);

  const reset = useCallback(() => {
    eventQueue.current = [];
    isPlaying.current = false;
    setState({
      status: 'idle',
      events: [],
      agentStates: { ...initialAgentStates },
      activeAgent: null,
      activeTool: null,
      finalResult: null,
      error: null,
    });
  }, []);

  return { ...state, startPipeline, enqueueEvent, reset };
}
