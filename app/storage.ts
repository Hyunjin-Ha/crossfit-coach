import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = 'device_id';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export async function getDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = generateUUID();
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

// 웹은 localStorage 동기, 네이티브는 AsyncStorage
const isWeb = typeof localStorage !== 'undefined';

export const chatStorage = {
  load(key: string): string | null {
    if (isWeb) return localStorage.getItem(key);
    return null; // 네이티브는 아래 loadAsync 사용
  },
  save(key: string, value: string): void {
    if (isWeb) {
      localStorage.setItem(key, value);
    } else {
      AsyncStorage.setItem(key, value).catch(() => {});
    }
  },
  async loadAsync(key: string): Promise<string | null> {
    if (isWeb) return localStorage.getItem(key);
    return AsyncStorage.getItem(key);
  },
};
