import { describe, it, expect, afterEach } from 'vitest';
import { getApi, setApiProvider, resetApiProvider } from '../api';

afterEach(() => resetApiProvider());

describe('sdk/api', () => {
  it('defaults to Common.EditorApi.get()', () => {
    const mockEditorApi = { test: true };
    Common.EditorApi.get = () => mockEditorApi;

    expect(getApi()).toBe(mockEditorApi);
  });

  it('uses custom provider after setApiProvider', () => {
    const custom = { custom: true };
    setApiProvider(() => custom);

    expect(getApi()).toBe(custom);
  });

  it('reverts to default after resetApiProvider', () => {
    const custom = { custom: true };
    setApiProvider(() => custom);
    resetApiProvider();

    const mockEditorApi = { test: true };
    Common.EditorApi.get = () => mockEditorApi;

    expect(getApi()).toBe(mockEditorApi);
  });
});
