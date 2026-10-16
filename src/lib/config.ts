import Constants from 'expo-constants';

// API_BASE_URL comes from app.config.ts (env API_BASE_URL, default https://api.skreenit.com).
// Same single backend as the website and the hiring app; Suite lives under /api/v1/suite.
const base = (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ?? 'https://api.skreenit.com';
export const API_BASE_URL = base.replace(/\/$/, '');
export const SUITE_API = `${API_BASE_URL}/api/v1/suite`;
export const WEBSITE_URL = 'suite.skreenit.com';
