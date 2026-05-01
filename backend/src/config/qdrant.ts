import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import { QdrantVectorStore } from '@langchain/qdrant';
import { QdrantClient } from '@qdrant/js-client-rest';
import { env } from './env';

export const createQdrantClient = () =>
  new QdrantClient({
    url: env.QDRANT_URL,
    apiKey: env.QDRANT_API_KEY,
  });

export const createRuleVectorStore = (embeddings: EmbeddingsInterface) =>
  new QdrantVectorStore(embeddings, {
    client: createQdrantClient(),
    collectionName: env.QDRANT_COLLECTION,
    contentPayloadKey: 'content',
    metadataPayloadKey: 'metadata',
  });
