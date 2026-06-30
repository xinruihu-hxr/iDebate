import { request } from './request';
import { getProfile as getLocalProfile, saveProfile } from './store';

export interface UserProfile {
  id: number;
  openid?: string;
  unionid?: string;
  nickname: string;
  avatarUrl?: string;
  school?: string;
  major?: string;
  grade?: string;
  bio?: string;
}

export function getProfile() {
  return request<UserProfile>({
    url: '/user/profile',
    fallback: () => getLocalProfile(),
  });
}

export function updateProfile(profile: UserProfile) {
  return request<UserProfile, UserProfile>({
    url: '/user/profile',
    method: 'PUT',
    data: profile,
    fallback: () => {
      saveProfile({
        avatarUrl: profile.avatarUrl || '',
        bio: profile.bio || '',
        grade: profile.grade || '',
        id: profile.id,
        openid: profile.openid,
        unionid: profile.unionid,
        major: profile.major || '',
        nickname: profile.nickname,
        school: profile.school || '',
      });
      return getLocalProfile();
    },
  });
}
