import { getMyTitles, getStatistics } from '../../services/statistics';
import { listMyTeams } from '../../services/team';
import { getProfile } from '../../services/user';

Page({
  data: {
    profile: null as any,
    stats: {} as any,
    titles: [] as string[],
    teams: [] as any[],
    teamCount: 0,
    avatarText: '我',
  },

  async onShow() {
    const [profile, stats, titles, teams] = await Promise.all([
      getProfile(),
      getStatistics(),
      getMyTitles(),
      listMyTeams(),
    ]);
    const decoratedTeams = (teams || []).map((team: any) => {
      const member = (team.members || []).find((item: any) => String(item.userId || item.name) === String(profile.id) || item.name === profile.nickname);
      return {
        ...team,
        logoText: (team.name || '队').slice(0, 1),
        memberCount: (team.members || []).length,
        myRole: member?.role || (team.members?.[0]?.name === profile.nickname ? '队长' : '成员'),
      };
    });
    this.setData({
      profile,
      stats,
      titles,
      teams: decoratedTeams,
      teamCount: decoratedTeams.length,
      avatarText: (profile.nickname || '我').slice(0, 1),
    });
  },

  toEditProfile() {
    wx.navigateTo({ url: '/pages/profile/edit' });
  },

  toTeamDetail(event: any) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/team-detail/index?id=${id}` });
  },

  toUserHome() {
    wx.navigateTo({ url: '/pages/user-home/index' });
  },

  viewMonthlyReport() {
    wx.navigateTo({ url: '/pages/report/index' });
  },
});
