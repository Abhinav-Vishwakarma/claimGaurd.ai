import { readStorage, writeStorage } from "./storage";

const ACCESS_KEY = "claimguard-access-token";
const REFRESH_KEY = "claimguard-refresh-token";

export function getAccessToken() {
  return readStorage(ACCESS_KEY);
}

export function getRefreshToken() {
  return readStorage(REFRESH_KEY);
}

export function saveTokens(tokens: { accessToken: string; refreshToken: string }) {
  writeStorage(ACCESS_KEY, tokens.accessToken);
  writeStorage(REFRESH_KEY, tokens.refreshToken);
}

export function clearTokens() {
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}
