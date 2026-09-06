import { resolveApiUrl } from '../../../packages/api-config/index.mjs';

export function getApiUrl(path: string): string {
  // Expo inlines only direct process.env.EXPO_PUBLIC_* references.
  return resolveApiUrl(process.env.EXPO_PUBLIC_API_BASE_URL, path, 'EXPO_PUBLIC_API_BASE_URL');
}
