import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MATRIX_PROJECT_STORAGE_PREFIX,
  getMatrixProjectStorageKey,
  getStoredMatrixProjectId,
  setStoredMatrixProjectId,
} from './matrix-storage';

describe('matrix-storage', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        store.delete(key);
      }),
    });

    vi.stubGlobal('window', {
      location: {
        pathname: '/matrix',
        search: '',
      },
      history: {
        replaceState: vi.fn(),
      },
    });
  });

  it('generates user-scoped storage key when userId provided', () => {
    expect(getMatrixProjectStorageKey('user-123')).toBe(
      `${MATRIX_PROJECT_STORAGE_PREFIX}_user-123`
    );
    expect(getMatrixProjectStorageKey(null)).toBe(MATRIX_PROJECT_STORAGE_PREFIX);
    expect(getMatrixProjectStorageKey(undefined)).toBe(MATRIX_PROJECT_STORAGE_PREFIX);
  });

  it('returns null when no project is stored and no query param exists', () => {
    expect(getStoredMatrixProjectId('key')).toBeNull();
  });

  it('returns stored project ID from localStorage', () => {
    store.set('key', 'proj-1');
    expect(getStoredMatrixProjectId('key')).toBe('proj-1');
  });

  it('falls back to legacy storage key if scoped key is absent', () => {
    store.set(MATRIX_PROJECT_STORAGE_PREFIX, 'legacy-proj');
    expect(getStoredMatrixProjectId('scoped-key')).toBe('legacy-proj');
  });

  it('prioritizes URL query param over localStorage', () => {
    store.set('key', 'proj-1');
    window.location.search = '?projectId=url-proj';
    expect(getStoredMatrixProjectId('key')).toBe('url-proj');

    window.location.search = '?project=url-proj-short';
    expect(getStoredMatrixProjectId('key')).toBe('url-proj-short');
  });

  it('saves project ID to localStorage', () => {
    setStoredMatrixProjectId('key', 'proj-2');
    expect(localStorage.setItem).toHaveBeenCalledWith('key', 'proj-2');
    expect(store.get('key')).toBe('proj-2');
  });

  it('removes project ID from localStorage and cleans legacy key when null is provided', () => {
    store.set('key', 'proj-2');
    store.set(MATRIX_PROJECT_STORAGE_PREFIX, 'proj-2');

    setStoredMatrixProjectId('key', null);
    expect(store.has('key')).toBe(false);
    expect(store.has(MATRIX_PROJECT_STORAGE_PREFIX)).toBe(false);
  });

  it('cleans up query parameters from URL when saving project selection', () => {
    window.location.search = '?projectId=url-proj&foo=bar';
    setStoredMatrixProjectId('key', 'proj-3');

    expect(window.history.replaceState).toHaveBeenCalledWith(
      null,
      '',
      '/matrix?foo=bar'
    );
  });

  it('handles localStorage errors gracefully without throwing', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => {
        throw new Error('QuotaExceededError');
      }),
      setItem: vi.fn(() => {
        throw new Error('QuotaExceededError');
      }),
      removeItem: vi.fn(() => {
        throw new Error('QuotaExceededError');
      }),
    });

    expect(() => getStoredMatrixProjectId('key')).not.toThrow();
    expect(getStoredMatrixProjectId('key')).toBeNull();

    expect(() => setStoredMatrixProjectId('key', 'proj-1')).not.toThrow();
  });
});
