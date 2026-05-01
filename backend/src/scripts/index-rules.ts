import { createGoogleDocumentEmbeddings } from '../config/embeddings';
import { createRuleVectorStore } from '../config/qdrant';
import { buildRuleDocuments } from '../rag/rule-documents';
import logger from '../utils/logger';

const indexRules = async () => {
  const documents = buildRuleDocuments();
  const embeddings = createGoogleDocumentEmbeddings();
  const vectorStore = createRuleVectorStore(embeddings);

  await vectorStore.addDocuments(documents, {
    ids: documents.map((document) => document.id).filter((id): id is string => Boolean(id)),
  });

  logger.info(`Indexed ${documents.length} rule documents into Qdrant.`);
};

indexRules().catch((error) => {
  logger.error('Failed to index rule documents:', error);
  process.exit(1);
});
