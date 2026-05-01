import { env } from '../../../config/env';
import type { AiAttachment, AiGenerateInput, AiGenerateResult } from '../../../api/ai/ai.types';

type GroqResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
  };
};

const textMimeTypes = new Set(['application/json', 'application/xml', 'application/csv', 'text/csv']);

const isTextAttachment = (attachment: AiAttachment) =>
  attachment.mimeType.startsWith('text/') || textMimeTypes.has(attachment.mimeType);

const isImageAttachment = (attachment: AiAttachment) => attachment.mimeType.startsWith('image/');

const decodeTextAttachment = (attachment: AiAttachment) =>
  Buffer.from(attachment.dataBase64, 'base64').toString('utf-8');

const toGroqMessageContent = (input: AiGenerateInput) => {
  const attachments = input.attachments ?? [];
  const unsupported = attachments.filter((attachment) => !isTextAttachment(attachment) && !isImageAttachment(attachment));

  if (unsupported.length > 0) {
    const error = new Error(
      `Groq only supports text and image attachments through this endpoint. Unsupported files: ${unsupported
        .map((attachment) => attachment.filename)
        .join(', ')}`,
    );
    Object.assign(error, { status: 400 });
    throw error;
  }

  const textBlocks = attachments
    .filter(isTextAttachment)
    .map((attachment) => `\n\nAttachment ${attachment.filename} (${attachment.mimeType}):\n${decodeTextAttachment(attachment)}`)
    .join('');

  const imageBlocks = attachments.filter(isImageAttachment).map((attachment) => ({
    type: 'image_url',
    image_url: {
      url: `data:${attachment.mimeType};base64,${attachment.dataBase64}`,
    },
  }));

  if (imageBlocks.length === 0) {
    return `${input.prompt}${textBlocks}`;
  }

  return [{ type: 'text', text: `${input.prompt}${textBlocks}` }, ...imageBlocks];
};

export const generateWithGroq = async (input: AiGenerateInput): Promise<AiGenerateResult> => {
  if (!env.GROQ_API_KEY) {
    const error = new Error('GROQ_API_KEY is required for Groq AI requests.');
    Object.assign(error, { status: 500 });
    throw error;
  }

  const modelName = input.model || env.GROQ_DEFAULT_MODEL;
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelName,
      messages: [{ role: 'user', content: toGroqMessageContent(input) }],
      temperature: input.options?.temperature,
      max_tokens: input.options?.maxTokens,
    }),
  });

  const data = (await response.json()) as GroqResponse;

  if (!response.ok) {
    const error = new Error(data.error?.message || 'Groq AI request failed.');
    Object.assign(error, { status: response.status });
    throw error;
  }

  return {
    service: 'groq',
    model: modelName,
    text: data.choices?.[0]?.message?.content ?? '',
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        }
      : undefined,
    attachments: {
      count: input.attachments?.length ?? 0,
      filenames: input.attachments?.map((attachment) => attachment.filename) ?? [],
    },
  };
};
