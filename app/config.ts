const _raw = process.env.EXPO_PUBLIC_API_URL ?? 'https://crossfit-coach-ggb0.onrender.com';
export const API_URL = _raw.replace(/^http:\/\//, 'https://');
