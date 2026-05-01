import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import { env } from '../../../config/env';
import type { AiGenerateInput, AiGenerateResult } from '../../../api/ai/ai.types';

const toGoogleParts = (input: AiGenerateInput): Part[] => [
  { text: input.prompt },
  ...(input.attachments ?? []).map((attachment) => ({
    inlineData: {
      mimeType: attachment.mimeType,
      data: attachment.dataBase64,
    },
  })),
];

export const generateWithGoogle = async (input: AiGenerateInput): Promise<AiGenerateResult> => {
  if (!env.GOOGLE_API_KEY) {
    const error = new Error('GOOGLE_API_KEY is required for Google AI requests.');
    Object.assign(error, { status: 500 });
    throw error;
  }

  const modelName = input.model || env.GOOGLE_DEFAULT_MODEL;
  const client = new GoogleGenerativeAI(env.GOOGLE_API_KEY);
  const model = client.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: input.options?.temperature,
      maxOutputTokens: input.options?.maxTokens,
    },
  });

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: toGoogleParts(input) }],
  });

  const usage = result.response.usageMetadata;

  return {
    service: 'google',
    model: modelName,
    text: result.response.text(),
    usage: usage
      ? {
          promptTokens: usage.promptTokenCount,
          completionTokens: usage.candidatesTokenCount,
          totalTokens: usage.totalTokenCount,
        }
      : undefined,
    attachments: {
      count: input.attachments?.length ?? 0,
      filenames: input.attachments?.map((attachment) => attachment.filename) ?? [],
    },
  };
};
