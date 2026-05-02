import { generateWithGoogle } from '../../services/ai/providers/google.provider';
import { generateWithGroq } from '../../services/ai/providers/groq.provider';
import type { AiGenerateInput, AiGenerateResult } from './ai.types';

export const aiService = {
  generate: async (input: AiGenerateInput): Promise<AiGenerateResult> => {
    switch (input.service) {
      case 'google':
        return generateWithGoogle(input);
      case 'groq':
        return generateWithGroq(input);
      default: {
        const error = new Error('Unsupported AI service');
        Object.assign(error, { status: 400 });
        throw error;
      }
    }
  },
};
