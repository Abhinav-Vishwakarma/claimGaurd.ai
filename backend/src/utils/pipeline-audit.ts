import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { ServiceMap } from '../api/ocr/ocr.types';

export type AuditStatus = 'ok' | 'warn' | 'error';

export type FieldAuditEntry = {
  field_path: string;
  extracted_value: unknown;
  is_null_or_empty: boolean;
  is_critical: boolean;
};

export type AuditIssue = {
  code: string;
  field?: string;
  message: string;
  raw_text_chunk?: string | null;
  values?: unknown;
};

export type AuditPhaseEntry = {
  phase: string;
  agent: string;
  status: AuditStatus;
  input_snapshot: Record<string, unknown>;
  output_snapshot: Record<string, unknown>;
  field_audit: FieldAuditEntry[];
  issues: AuditIssue[];
};

type AuditSummary = {
  overall_status: 'claimable' | 'non_claimable' | 'audit_required';
  data_completeness_score: number;
  critical_nulls: string[];
  false_positive_risks: string[];
  cross_agent_mismatches: string[];
  root_cause_hypothesis: string;
};

type AuditFileShape = {
  run_id: string;
  timestamp: string;
  input_files: Array<Record<string, unknown>>;
  phases: AuditPhaseEntry[];
  summary?: AuditSummary;
};

const CRITICAL_FIELD_PATHS = new Set([
  'metadata.patient_id',
  'metadata.date_of_service',
  'metadata.provider_npi',
  'triangulation_data.prescription.ordered_service',
  'triangulation_data.prescription.reason',
  'triangulation_data.billing.cpt_codes',
  'triangulation_data.billing.billed_amount',
  'triangulation_data.lab_report.performed_service',
]);

const FIELD_HINTS: Record<string, string[]> = {
  'metadata.patient_id': ['patient id', 'member id', 'patient', 'member'],
  'metadata.date_of_service': ['date of service', 'service date', 'dos', 'date'],
  'metadata.provider_npi': ['npi', 'provider', 'physician'],
  'triangulation_data.prescription.ordered_service': ['ordered service', 'procedure', 'service', 'test ordered'],
  'triangulation_data.prescription.reason': ['reason', 'diagnosis', 'indication', 'clinical reason'],
  'triangulation_data.billing.cpt_codes': ['cpt', 'procedure code', 'billing code'],
  'triangulation_data.billing.billed_amount': ['total', 'amount', 'charge', 'billed'],
  'triangulation_data.lab_report.performed_service': ['performed service', 'test performed', 'lab test', 'procedure'],
};

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const isNullOrEmpty = (value: unknown): boolean => {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length === 0;
  return false;
};

const getValueAtPath = (obj: Record<string, unknown>, fieldPath: string): unknown =>
  fieldPath.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);

const flattenObject = (value: unknown, prefix = ''): FieldAuditEntry[] => {
  if (Array.isArray(value) || value == null || typeof value !== 'object') {
    return prefix
      ? [{
          field_path: prefix,
          extracted_value: value,
          is_null_or_empty: isNullOrEmpty(value),
          is_critical: CRITICAL_FIELD_PATHS.has(prefix),
        }]
      : [];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(child) || child == null || typeof child !== 'object') {
      return [{
        field_path: nextPrefix,
        extracted_value: child,
        is_null_or_empty: isNullOrEmpty(child),
        is_critical: CRITICAL_FIELD_PATHS.has(nextPrefix),
      }];
    }
    const children = flattenObject(child, nextPrefix);
    return children.length > 0
      ? children
      : [{
          field_path: nextPrefix,
          extracted_value: child,
          is_null_or_empty: isNullOrEmpty(child),
          is_critical: CRITICAL_FIELD_PATHS.has(nextPrefix),
        }];
  });
};

const computeCompleteness = (fieldAudit: FieldAuditEntry[]): number => {
  const criticalFields = fieldAudit.filter((entry) => entry.is_critical);
  if (criticalFields.length === 0) return 100;
  const nonNullCritical = criticalFields.filter((entry) => !entry.is_null_or_empty).length;
  return Number(((nonNullCritical / criticalFields.length) * 100).toFixed(2));
};

const extractRawTextChunk = (rawText: string | null | undefined, fieldPath: string): string | null => {
  if (!rawText) return null;
  const lowered = rawText.toLowerCase();
  const hints = FIELD_HINTS[fieldPath] ?? [];

  for (const hint of hints) {
    const idx = lowered.indexOf(hint.toLowerCase());
    if (idx >= 0) {
      const start = Math.max(0, idx - 80);
      const end = Math.min(rawText.length, idx + hint.length + 160);
      return rawText.slice(start, end).trim();
    }
  }

  return null;
};

const categorizeCpt = (cpt: string): string => {
  const value = Number.parseInt(cpt, 10);
  if (Number.isNaN(value)) return 'unknown';
  if (value >= 99202 && value <= 99499) return 'E&M';
  if (value >= 70010 && value <= 79999) return 'imaging';
  if (value >= 80047 && value <= 89398) return 'lab';
  if (value >= 97000 && value <= 97799) return 'therapy';
  return 'other';
};

export const buildServiceMapFieldAudit = (serviceMap: ServiceMap) => {
  const fieldAudit = flattenObject(serviceMap as unknown as Record<string, unknown>);
  const dataCompletenessScore = computeCompleteness(fieldAudit);
  return { fieldAudit, dataCompletenessScore };
};

export const buildCriticalNullIssues = (serviceMap: ServiceMap, rawText?: string | null): AuditIssue[] => {
  const { fieldAudit } = buildServiceMapFieldAudit(serviceMap);
  return fieldAudit
    .filter((entry) => entry.is_critical && entry.is_null_or_empty)
    .map((entry) => ({
      code: 'CRITICAL_FIELD_NULL',
      field: entry.field_path,
      message: `Critical field "${entry.field_path}" is null or empty`,
      raw_text_chunk: extractRawTextChunk(rawText, entry.field_path),
    }));
};

export const reconcileServiceMaps = (
  prescription: ServiceMap,
  bill: ServiceMap,
  labReport: ServiceMap,
) => {
  const mismatches: AuditIssue[] = [];

  const patientIds = {
    prescription: prescription.metadata.patient_id,
    bill: bill.metadata.patient_id,
    lab_report: labReport.metadata.patient_id,
  };

  if (new Set(Object.values(patientIds).filter(Boolean)).size > 1) {
    mismatches.push({
      code: 'CROSS_AGENT_MISMATCH',
      field: 'metadata.patient_id',
      message: 'Patient ID is not identical across ServiceMaps',
      values: patientIds,
    });
  }

  const dates = {
    prescription: prescription.metadata.date_of_service,
    lab_report: labReport.metadata.date_of_service,
    bill: bill.metadata.date_of_service,
  };
  const rx = dates.prescription ? new Date(dates.prescription) : null;
  const lab = dates.lab_report ? new Date(dates.lab_report) : null;
  const billDate = dates.bill ? new Date(dates.bill) : null;
  if ((rx && lab && rx > lab) || (lab && billDate && lab > billDate)) {
    mismatches.push({
      code: 'CROSS_AGENT_MISMATCH',
      field: 'metadata.date_of_service',
      message: 'Date chronology is inconsistent (expected prescription <= lab_report <= bill)',
      values: dates,
    });
  }

  const billCpts = bill.triangulation_data.billing.cpt_codes ?? [];
  const orderedText = prescription.triangulation_data.prescription.ordered_service?.toLowerCase() ?? '';
  const performedText = labReport.triangulation_data.lab_report.performed_service?.toLowerCase() ?? '';
  const missingCpts = billCpts.filter((cpt) => {
    const normalized = cpt.toLowerCase();
    return !orderedText.includes(normalized) && !performedText.includes(normalized);
  });
  if (missingCpts.length > 0) {
    mismatches.push({
      code: 'CROSS_AGENT_MISMATCH',
      field: 'triangulation_data.billing.cpt_codes',
      message: 'Some billed CPTs do not appear in prescription ordered service or lab performed service',
      values: {
        missing_cpts: missingCpts,
        ordered_service: prescription.triangulation_data.prescription.ordered_service,
        performed_service: labReport.triangulation_data.lab_report.performed_service,
      },
    });
  }

  const lineItems = getValueAtPath(
    bill as unknown as Record<string, unknown>,
    'triangulation_data.billing.line_items',
  );
  if (Array.isArray(lineItems) && bill.triangulation_data.billing.billed_amount != null) {
    const sum = lineItems.reduce((total, item) => {
      if (!item || typeof item !== 'object') return total;
      const unitPrice = Number((item as Record<string, unknown>).unit_price ?? 0);
      const units = Number((item as Record<string, unknown>).units ?? 1);
      return total + unitPrice * units;
    }, 0);
    if (Number.isFinite(sum) && Number(sum.toFixed(2)) !== Number(bill.triangulation_data.billing.billed_amount.toFixed(2))) {
      mismatches.push({
        code: 'CROSS_AGENT_MISMATCH',
        field: 'triangulation_data.billing.billed_amount',
        message: 'Bill amount does not match sum of line items',
        values: {
          billed_amount: bill.triangulation_data.billing.billed_amount,
          line_item_sum: Number(sum.toFixed(2)),
        },
      });
    }
  }

  return {
    mismatches,
    patientIdConsistent: !mismatches.some((entry) => entry.field === 'metadata.patient_id'),
    chronologyConsistent: !mismatches.some((entry) => entry.field === 'metadata.date_of_service'),
  };
};

export const evaluateFalsePositiveRisk = (allowedCpts: string[], unbundlingFlagged: boolean) => {
  const categories = Array.from(new Set(allowedCpts.map(categorizeCpt).filter((value) => value !== 'other' && value !== 'unknown')));
  const highRisk = unbundlingFlagged && categories.length >= 3;
  return {
    score: highRisk ? 'HIGH_FALSE_POSITIVE_RISK' : 'LOW',
    explanation: highRisk
      ? `Matched condition spans ${categories.join(', ')} CPT categories, so an unbundling flag may be a false positive.`
      : `Matched condition spans ${categories.join(', ') || 'no major'} CPT categories.`,
    categories,
  };
};

export class PipelineAuditLogger {
  readonly runId: string;
  readonly timestamp: string;
  readonly filePath: string;
  private state: AuditFileShape;
  private flushChain: Promise<void> = Promise.resolve();

  private constructor(filePath: string, inputFiles: Array<Record<string, unknown>>) {
    this.runId = randomUUID();
    this.timestamp = new Date().toISOString();
    this.filePath = filePath;
    this.state = {
      run_id: this.runId,
      timestamp: this.timestamp,
      input_files: inputFiles,
      phases: [],
    };
  }

  static async create(inputFiles: Array<Record<string, unknown>>): Promise<PipelineAuditLogger> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logsDir = path.resolve(process.cwd(), 'logs');
    await mkdir(logsDir, { recursive: true });
    const filePath = path.join(logsDir, `pipeline_audit_${timestamp}.json`);
    const logger = new PipelineAuditLogger(filePath, inputFiles);
    await logger.flushNow();
    return logger;
  }

  addPhase(entry: AuditPhaseEntry): void {
    this.safeMutate(() => {
      this.state.phases.push(deepClone(entry));
    });
  }

  setSummary(summary: AuditSummary): void {
    this.safeMutate(() => {
      this.state.summary = deepClone(summary);
    });
  }

  getSnapshot(): AuditFileShape {
    return deepClone(this.state);
  }

  private safeMutate(mutator: () => void): void {
    try {
      mutator();
      this.queueFlush();
    } catch (error) {
      console.warn('[PipelineAudit] Failed to record audit entry:', error);
    }
  }

  private queueFlush(): void {
    this.flushChain = this.flushChain
      .then(() => this.flushNow())
      .catch((error) => {
        console.warn('[PipelineAudit] Failed to flush audit file:', error);
      });
  }

  private async flushNow(): Promise<void> {
    try {
      const tempFile = `${this.filePath}.tmp`;
      await writeFile(tempFile, JSON.stringify(this.state, null, 2), 'utf-8');
      await rename(tempFile, this.filePath);
    } catch (error) {
      console.warn('[PipelineAudit] Failed to write audit file:', error);
    }
  }
}
