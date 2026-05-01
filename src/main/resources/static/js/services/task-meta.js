const STORAGE_KEY = "taskMetaById";

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch (error) {
    return {};
  }
}

function writeAll(value) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export function getTaskMeta(taskId) {
  const all = readAll();
  return all[String(taskId)] || { priority: "MEDIUM", tags: [] };
}

export function saveTaskMeta(taskId, meta) {
  const all = readAll();
  all[String(taskId)] = {
    priority: meta.priority || "MEDIUM",
    tags: Array.isArray(meta.tags) ? meta.tags.slice(0, 8) : []
  };
  writeAll(all);
}

export function removeMissingTaskMeta(existingTaskIds) {
  const currentIds = new Set(existingTaskIds.map((id) => String(id)));
  const all = readAll();
  const next = {};
  Object.keys(all).forEach((taskId) => {
    if (currentIds.has(taskId)) {
      next[taskId] = all[taskId];
    }
  });
  writeAll(next);
}
