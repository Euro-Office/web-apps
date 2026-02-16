/**
 * Thin adapter around Common.EditorApi.get() for testability.
 *
 * Production code calls getApi() instead of Common.EditorApi.get() directly.
 * Tests swap the provider via setApiProvider() to inject a mock.
 */

let _apiProvider = () => Common.EditorApi.get();

export const getApi = () => _apiProvider();

export const setApiProvider = (provider) => {
  _apiProvider = provider;
};

export const resetApiProvider = () => {
  _apiProvider = () => Common.EditorApi.get();
};
