import { listMatches } from '../../services/match';
import { getTeamDetail } from '../../services/team';

Page({
  data: {
    team: null as any,
    member: null as any,
    totalMatches: 0,
    winRate: 0,
    bestMatch: null as any,
  },

  async onLoad(query: any) {
    const teamId = Number(query.teamId || 0);
    const name = decodeURIComponent(query.name || '');
    const [team, matches] = await Promise.all([getTeamDetail(teamId), listMatches()]);
    const member = team ? team.members.find((item: any) => item.name === name) : null;
    if (!team || !member) {
      wx.showToast({ title: '成员不存在', icon: 'none' });
      wx.navigateBack();
      return;
    }
    const totalWins = matches.filter((match) => match.result === 'WIN').length;
    this.setData({
      team,
      member,
      totalMatches: matches.length,
      winRate: matches.length ? Math.round((totalWins / matches.length) * 100) : 0,
      bestMatch: matches[0] || null,
    });
  },
});
