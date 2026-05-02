import { generateWithGoogle } from '../../services/ai/providers/google.provider';
import { generateWithGroq } from '../../services/ai/providers/groq.provider';
import type { AiGenerateInput, AiGenerateResult } from './ai.types';

export const aiService = {
  generate: async (input: AiGenerateInput): Promise<AiGenerateResult> => {
    const startedAt = new Date().toISOString();
    const startedMs = Date.now();

    try {
      let result: AiGenerateResult;

      switch (input.service) {
        case 'google':
          result = await generateWithGoogle(input);
          break;
        case 'groq':
          result = await generateWithGroq(input);
          break;
        default: {
          const error = new Error('Unsupported AI service');
          Object.assign(error, { status: 400 });
          throw error;
        }
      }

      input.audit?.logger?.addPhase({
        phase: input.audit.phase,
        agent: input.audit.agent,
        status: 'ok',
        input_snapshot: {
          llm_service: input.service,
          prompt: input.prompt,
          attachments: input.attachments?.map((attachment) => ({
            filename: attachment.filename,
            mimeType: attachment.mimeType,
          })) ?? [],
          options: input.options ?? {},
          started_at: startedAt,
          ended_at: new Date().toISOString(),
          latency_ms: Date.now() - startedMs,
          ...(input.audit.inputSnapshot ?? {}),
        },
        output_snapshot: {
          raw_response_text: result.text,
          model: result.model,
          usage: result.usage ?? null,
          attachments: result.attachments,
          ...(input.audit.outputSnapshot ?? {}),
        },
        field_audit: [],
        issues: (input.audit.issues ?? []) as Array<Record<string, unknown>>,
      });

      return result;
    } catch (error) {
      input.audit?.logger?.addPhase({
        phase: input.audit.phase,
        agent: input.audit.agent,
        status: 'error',
        input_snapshot: {
          llm_service: input.service,
          prompt: input.prompt,
          attachments: input.attachments?.map((attachment) => ({
            filename: attachment.filename,
            mimeType: attachment.mimeType,
          })) ?? [],
          options: input.options ?? {},
          started_at: startedAt,
          ended_at: new Date().toISOString(),
          latency_ms: Date.now() - startedMs,
          ...(input.audit?.inputSnapshot ?? {}),
        },
        output_snapshot: {
          error: (error as Error).message,
          ...(input.audit?.outputSnapshot ?? {}),
        },
        field_audit: [],
        issues: [
          ...((input.audit?.issues ?? []) as Array<Record<string, unknown>>),
          { code: 'LLM_CALL_ERROR', message: (error as Error).message },
        ],
      });
      throw error;
    }
  },
};
