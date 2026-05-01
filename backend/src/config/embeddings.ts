import { TaskType } from '@google/generative-ai';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { env } from './env';

export const createGoogleDocumentEmbeddings = () => {
  if (!env.GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY is required to create rule embeddings.');
  }

  return new GoogleGenerativeAIEmbeddings({
    apiKey: env.GOOGLE_API_KEY,
    model: env.GOOGLE_EMBEDDING_MODEL,
    taskType: TaskType.RETRIEVAL_DOCUMENT,
    title: 'ClaimGuard claim compliance rules',
  });
};

export const createGoogleQueryEmbeddings = () => {
  if (!env.GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY is required to query rule embeddings.');
  }

  return new GoogleGenerativeAIEmbeddings({
    apiKey: env.GOOGLE_API_KEY,
    model: env.GOOGLE_EMBEDDING_MODEL,
    taskType: TaskType.RETRIEVAL_QUERY,
  });
};
