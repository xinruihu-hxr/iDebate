import { request } from './request';
import { getProfile } from './store';

export interface LoginResponse {
  token: string;
  userId: number;
  user?: {
    id: number;
    nickname: string;
    avatarUrl?: string;
    school?: string;
    major?: string;
    grade?: string;
    bio?: string;
  };
}

export function login(code: string) {
  return request<LoginResponse, { code: string }>({
    url: '/auth/login',
    method: 'POST',
    data: { code },
    fallback: () => {
      const profile = getProfile();
      const token = `local-token-${code || profile.id}`;
      getApp<IAppOption>().globalData.token = token;
      return { token, userId: profile.id, user: profile };
    },
  }).then((result) => {
    getApp<IAppOption>().globalData.token = result.token;
    getApp<IAppOption>().globalData.currentUser = result.user;
    return result;
  });
}
