export async function checkApiHealth() {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();
    return Boolean(data.ok && data.database);
  } catch {
    return false;
  }
}

export async function apiRequest(path, options = {}, context = {}) {
  const { onAuthError, onError, token } = context;

  try {
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

    if (response.status === 204) return {};

    const data = await response.json();
    if (!response.ok) {
      onError?.(data.message || "Ocurrio un error en la API.");
      if (response.status === 401) onAuthError?.();
      return null;
    }

    return data;
  } catch {
    onError?.("No se pudo conectar con el backend.");
    return null;
  }
}
