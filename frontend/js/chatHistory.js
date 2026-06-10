export function getChatStorageKey(chatKey, currentUser) {
  return `${chatKey}.${currentUser?.id || "local"}`;
}

export function loadChatHistory(chatKey, currentUser, timeoutMs, readJson, clearChatHistory) {
  const storageKey = getChatStorageKey(chatKey, currentUser);
  const stored = readJson(storageKey);
  if (!stored || !Array.isArray(stored.messages) || Date.now() - Number(stored.updatedAt || 0) > timeoutMs) {
    clearChatHistory(storageKey);
    return [];
  }

  return stored.messages
    .filter((message) => message && (message.from === "user" || message.from === "bot") && typeof message.text === "string")
    .slice(-10);
}

export function persistChatHistory(chatKey, currentUser, messages) {
  localStorage.setItem(
    getChatStorageKey(chatKey, currentUser),
    JSON.stringify({
      updatedAt: Date.now(),
      messages: messages.filter((message) => !message.thinking).slice(-10),
    })
  );
}

export function clearChatHistory(key) {
  localStorage.removeItem(key);
}
