const paramStore = new Map<string, unknown>();

export function storeNavigationParams(key: string, data: unknown) {
  paramStore.set(key, data);
}

export function consumeNavigationParams<T = unknown>(key: string): T | undefined {
  const data = paramStore.get(key);
  paramStore.delete(key);
  return data as T | undefined;
}
