import { searchClaimRules } from '../tools/rule-engine';
import logger from '../utils/logger';

const defaultQuery = 'Patient has cough and needs chest x-ray with CPT 71045';

const searchRules = async () => {
  const query = process.argv.slice(2).join(' ').trim() || defaultQuery;
  const results = await searchClaimRules(query, 3);

  logger.info(`Query: ${query}`);
  logger.info(`Found ${results.length} matching rule documents.`);

  results.forEach((result, index) => {
    logger.info(
      [
        `#${index + 1}`,
        `score=${result.score.toFixed(4)}`,
        `condition=${result.metadata.conditionName}`,
        `billableIcd10=${result.metadata.billableIcd10.join(', ')}`,
        `cptCodes=${result.metadata.cptCodes.join(', ')}`,
      ].join(' | '),
    );
  });
};

searchRules().catch((error) => {
  logger.error('Failed to search rule documents:', error);
  process.exit(1);
});
