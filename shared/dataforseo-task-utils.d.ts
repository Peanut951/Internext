export type DataForSeoTaskOutcome = "success" | "no_results" | "failed";

export function getWeeklyScanBatchSize(
  productCount: unknown,
  cycleDays?: unknown,
  recoveryDays?: unknown,
): number;

export function classifyDataForSeoTaskPayload(payload: Record<string, unknown>): {
  outcome: DataForSeoTaskOutcome;
  statusCode: number;
  statusMessage: string;
};

export function collectDataForSeoTaskPayloads<T extends { id: string; tag: string }>(
  readyTasks: T[],
  requestTask: (ready: T) => Promise<Record<string, unknown>>,
  concurrency?: number,
): Promise<Array<{
  ready: T;
  payload: Record<string, unknown> | null;
  outcome: DataForSeoTaskOutcome;
}>>;

export function buildDataForSeoSearchKeyword(product: Record<string, unknown>): string;
