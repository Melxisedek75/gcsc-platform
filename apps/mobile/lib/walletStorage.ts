import AsyncStorage from '@react-native-async-storage/async-storage';

const READ_TIMEOUT_MS = 2500;

async function getItem(key: string): Promise<string | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      AsyncStorage.getItem(key),
      new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), READ_TIMEOUT_MS); }),
    ]);
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export const walletStorage = {
  getItem,
  setItem: (key: string, value: string): Promise<void> => AsyncStorage.setItem(key, value),
  removeItem: (key: string): Promise<void> => AsyncStorage.removeItem(key),
};
