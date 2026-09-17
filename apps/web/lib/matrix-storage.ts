export const MATRIX_PROJECT_STORAGE_PREFIX = 'offload_matrix_project_id';

export function getMatrixProjectStorageKey(userId?: string | null): string {
  return userId ? `${MATRIX_PROJECT_STORAGE_PREFIX}_${userId}` : MATRIX_PROJECT_STORAGE_PREFIX;
}

export function getStoredMatrixProjectId(storageKey: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const urlProjectId = urlParams.get('projectId') || urlParams.get('project');
    if (urlProjectId) {
      return urlProjectId;
    }
    return localStorage.getItem(storageKey) || localStorage.getItem(MATRIX_PROJECT_STORAGE_PREFIX);
  } catch {
    return null;
  }
}

export function setStoredMatrixProjectId(storageKey: string, projectId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (projectId) {
      localStorage.setItem(storageKey, projectId);
    } else {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(MATRIX_PROJECT_STORAGE_PREFIX);
    }

    if (window.location.search) {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('projectId') || urlParams.has('project')) {
        urlParams.delete('projectId');
        urlParams.delete('project');
        const newSearch = urlParams.toString();
        const newUrl = newSearch
          ? `${window.location.pathname}?${newSearch}`
          : window.location.pathname;
        window.history.replaceState(null, '', newUrl);
      }
    }
  } catch {
    // Ignore storage and navigation errors (e.g. private browsing or sandboxed iframes)
  }
}
