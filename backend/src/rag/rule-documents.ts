import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Document } from '@langchain/core/documents';

type CptCode = {
  code: string;
  description: string;
  allowable_amount?: number;
};

type ClaimCondition = {
  name: string;
  icd10: {
    non_billable: string[];
    billable: string[];
  };
  allowed_cpt_codes: CptCode[];
  financials: {
    copay: number;
    coinsurance_percent: number;
  };
  reasoning_traps: string[];
};

type RulesFile = {
  system_rules: Record<string, unknown>;
  conditions: ClaimCondition[];
};

export type RuleDocumentMetadata = {
  source: 'rules.json';
  ruleType: 'claim_condition';
  conditionName: string;
  billableIcd10: string[];
  nonBillableIcd10: string[];
  cptCodes: string[];
  reasoningTraps: string[];
};

const rulesPath = path.join(process.cwd(), 'src', 'data', 'rules.json');

const createStableUuid = (value: string) => {
  const hex = crypto.createHash('sha256').update(value).digest('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `8${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-');
};

function buildConditionDocument(condition: ClaimCondition): string {
  const cptDescriptions = condition.allowed_cpt_codes
    .map((cpt) => `${cpt.code} ${cpt.description}`)
    .join(', ');

  return `
    Condition Name: ${condition.name}
    Billable ICD-10: ${condition.icd10.billable.join(', ')}
    Non-Billable ICD-10: ${condition.icd10.non_billable.join(', ')}
    Allowed Procedures and Tests: ${cptDescriptions}
    Known Fraud Patterns: ${condition.reasoning_traps.join('. ')}
    Clinical Category: outpatient diagnostic workup
    Patient Copay: ${condition.financials?.copay ?? 'unknown'}
    Coinsurance: ${condition.financials?.coinsurance_percent ?? 'unknown'}
    Structured Condition JSON: ${JSON.stringify(condition)}
  `.trim();
}

export const loadRules = (): RulesFile => {
  const rawRules = fs.readFileSync(rulesPath, 'utf-8');
  return JSON.parse(rawRules) as RulesFile;
};

export const buildRuleDocuments = () => {
  const rules = loadRules();

  return rules.conditions.map((condition) => {
    const id = createStableUuid(`rules.json:condition:${condition.name}`);
    const metadata: RuleDocumentMetadata = {
      source: 'rules.json',
      ruleType: 'claim_condition',
      conditionName: condition.name,
      billableIcd10: condition.icd10.billable,
      nonBillableIcd10: condition.icd10.non_billable,
      cptCodes: condition.allowed_cpt_codes.map((cpt) => cpt.code),
      reasoningTraps: condition.reasoning_traps,
    };

    return new Document({
      id,
      pageContent: buildConditionDocument(condition),
      metadata,
    });
  });
};
