import { request } from './request';
import { getAbilityProfile, getAbilityStats, getStatistics as getLocalStatistics, getTitles } from './store';

export function getStatistics() {
  return request({ url: '/statistics', fallback: () => getLocalStatistics() });
}

export function getAbilityRadar() {
  return request({
    url: '/statistics/ability-profile',
    fallback: () => getAbilityProfile(),
  }).then((profile: any) => profile.abilities || getAbilityStats());
}

export function getAbilityProfileData() {
  return request({
    url: '/statistics/ability-profile',
    fallback: () => getAbilityProfile(),
  });
}

export function getMyTitles() {
  return request<string[]>({ url: '/title/my', fallback: () => getTitles() });
}
