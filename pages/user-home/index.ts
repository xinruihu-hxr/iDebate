import { listMatches } from '../../services/match';
import { getAbilityProfileData, getMyTitles, getStatistics } from '../../services/statistics';
import { listMyTeams } from '../../services/team';
import { getProfile } from '../../services/user';

Page({
  data: {
    profile: null as any,
    stats: {},
    titles: [] as string[],
    abilities: [] as any[],
    strengths: [] as any[],
    weaknesses: [] as any[],
    recommendedPosition: '-',
    peerReviewSupplement: 0,
    hasTagData: false,
    matches: [] as any[],
    teamName: '',
  },

  async onShow() {
    const [profile, stats, titles, abilityProfile, matches, teams] = await Promise.all([
      getProfile(),
      getStatistics(),
      getMyTitles(),
      getAbilityProfileData(),
      listMatches(),
      listMyTeams(),
    ]);
    this.setData({
      profile,
      stats,
      titles,
      abilities: abilityProfile.abilities || [],
      strengths: abilityProfile.strengths || [],
      weaknesses: abilityProfile.weaknesses || [],
      recommendedPosition: abilityProfile.recommendedPosition || '-',
      peerReviewSupplement: abilityProfile.peerReviewSupplement || 0,
      hasTagData: Boolean(abilityProfile.hasTagData),
      matches: matches.slice(0, 3),
      teamName: teams[0] ? teams[0].name : '未加入队伍',
    });
  },
});
