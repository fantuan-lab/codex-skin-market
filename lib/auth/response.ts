export const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
  Expires: "0",
  Pragma: "no-cache",
} as const;

export function applyPrivateNoStore<T extends Response>(response: T): T {
  Object.entries(PRIVATE_NO_STORE_HEADERS).forEach(([name, value]) => {
    response.headers.set(name, value);
  });
  return response;
}
