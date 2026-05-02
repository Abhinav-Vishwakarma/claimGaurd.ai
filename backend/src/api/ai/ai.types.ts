export const aiServices = ['google', 'groq'] as const;
export type AiServiceName = (typeof aiServices)[number];

export type AiAttachment = {
  filename: string;
  mimeType: string;
  dataBase64: string;
};

export type AiGenerateOptions = {
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json_object' | 'text';
};

export type AiGenerateInput = {
  service: AiServiceName;
  model?: string;
  prompt: string;
  attachments?: AiAttachment[];
  options?: AiGenerateOptions;
};

export type AiUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export type AiGenerateResult = {
  service: AiServiceName;
  model: string;
  text: string;
  usage?: AiUsage;
  attachments: {
    count: number;
    filenames: string[];
  };
};
