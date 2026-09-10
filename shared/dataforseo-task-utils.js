const tasksFromPayload = (payload) => Array.isArray(payload?.tasks) ? payload.tasks : [];

export const classifyDataForSeoTaskPayload = (payload) => {
  const failedTask = tasksFromPayload(payload)
    .find((task) => Number(task?.status_code) >= 40000);
  if (!failedTask) {
    return { outcome: "success", statusCode: 20000, statusMessage: "Ok." };
  }

  const statusCode = Number(failedTask.status_code);
  return {
    outcome: statusCode === 40102 ? "no_results" : "failed",
    statusCode,
    statusMessage: String(failedTask.status_message || "Unknown DataForSEO task error."),
  };
};

export const collectDataForSeoTaskPayloads = async (
  readyTasks,
  requestTask,
  concurrency = 8,
) => {
  const results = new Array(readyTasks.length);
  let index = 0;
  const workers = Array.from(
    { length: Math.min(Math.max(1, concurrency), readyTasks.length) },
    async () => {
      while (index < readyTasks.length) {
        const currentIndex = index;
        index += 1;
        const ready = readyTasks[currentIndex];
        try {
          const payload = await requestTask(ready);
          const taskStatus = classifyDataForSeoTaskPayload(payload);
          results[currentIndex] = {
            ready,
            payload: taskStatus.outcome === "success" ? payload : null,
            outcome: taskStatus.outcome,
          };
        } catch {
          results[currentIndex] = { ready, payload: null, outcome: "failed" };
        }
      }
    },
  );
  await Promise.all(workers);
  return results;
};

const getGtin = (product) => {
  for (const value of [product?.gtin, product?.ean, product?.upc, product?.barcode]) {
    const digits = String(value || "").replace(/\D/g, "");
    if (/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(digits)) return digits;
  }
  return "";
};

export const buildDataForSeoSearchKeyword = (product) => {
  const model = String(product?.supplierCode || product?.code || "").trim();
  const keyword = [product?.manufacturer, model]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" ")
    .slice(0, 700);
  return keyword || getGtin(product);
};
