export function loadLocalTasks(storageKey, fallbackTasks, sortTasks) {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return sortTasks([...fallbackTasks]);

  try {
    return sortTasks(JSON.parse(saved));
  } catch {
    return sortTasks([...fallbackTasks]);
  }
}

export function persistLocalTasks(storageKey, tasks) {
  localStorage.setItem(storageKey, JSON.stringify(tasks));
}
