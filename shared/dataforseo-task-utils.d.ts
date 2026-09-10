export type DataForSeoTaskOutcome = "success" | "no_results" | "failed";

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
