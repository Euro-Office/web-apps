import { vi } from 'vitest';
import { setApiProvider, resetApiProvider } from './api.js';

/**
 * Creates a mock API object with the most commonly used methods.
 * All methods are vi.fn() stubs — extend as needed.
 */
export const createMockApi = () => ({
  asc_registerCallback: vi.fn(),
  asc_unregisterCallback: vi.fn(),
  asc_setParagraphStylesSizes: vi.fn(),
  asc_getChartPreviews: vi.fn(),
  getSelectedElements: vi.fn(() => []),
  can_CopyCut: vi.fn(() => true),
  can_AddQuotedComment: vi.fn(() => true),
  asc_GetFontThumbnailsRecovery: vi.fn(),
});

/**
 * Installs a mock API as the provider and returns it.
 * Call cleanup() or resetApiProvider() in afterEach.
 *
 * Usage:
 *   let api;
 *   beforeEach(() => { api = installMockApi(); });
 *   afterEach(() => resetMockApi());
 */
export const installMockApi = () => {
  const api = createMockApi();
  setApiProvider(() => api);
  return api;
};

export const resetMockApi = resetApiProvider;
