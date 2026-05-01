import type { Document } from '@langchain/core/documents';
import { createGoogleQueryEmbeddings } from '../config/embeddings';
import { createRuleVectorStore } from '../config/qdrant';
import type { RuleDocumentMetadata } from '../rag/rule-documents';

export type RuleSearchResult = {
  score: number;
  content: string;
  metadata: RuleDocumentMetadata;
};

const mapSearchResult = ([document, score]: [Document, number]): RuleSearchResult => ({
  score,
  content: document.pageContent,
  metadata: document.metadata as RuleDocumentMetadata,
});

export const searchClaimRules = async (query: string, limit = 3): Promise<RuleSearchResult[]> => {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const embeddings = createGoogleQueryEmbeddings();
  const vectorStore = createRuleVectorStore(embeddings);
  const results = await vectorStore.similaritySearchWithScore(trimmedQuery, limit);

  return results.map(mapSearchResult);
};
