import { listMatches } from '../../services/match';
import { getStatistics } from '../../services/statistics';
import { listMyTeams } from '../../services/team';

Page({
  data: {
    teams: [] as any[],
    stats: {} as any,
    teamSummary: {
      totalMatches: 0,
      totalWins: 0,
      totalLosses: 0,
      winRate: 0,
      pieStyle: 'background: conic-gradient(#8f1d1d 0% 0%, #ebdb79 0% 100%);',
    },
    memberRankings: [] as any[],
  },

  async onShow() {
    const [teams, stats, matches] = await Promise.all([listMyTeams(), getStatistics(), listMatches()]);
    const teamSummary = this.buildTeamSummary(matches);
    const memberRankings = this.buildMemberRankings(teams[0], matches);
    this.setData({ teams, stats, teamSummary, memberRankings });
  },

  buildTeamSummary(matches: any[]) {
    const totalMatches = matches.length;
    const totalWins = matches.filter((match) => match.result === 'WIN').length;
    const totalLosses = totalMatches - totalWins;
    const winRate = totalMatches ? Math.round((totalWins / totalMatches) * 100) : 0;
    const pieStyle = `background: conic-gradient(#8f1d1d 0% ${winRate}%, #ebdb79 ${winRate}% 100%);`;
    return { totalMatches, totalWins, totalLosses, winRate, pieStyle };
  },

  buildMemberRankings(team: any, matches: any[]) {
    if (!team || !team.members) return [];
    const rankings = team.members.map((member: any) => {
      const memberMatches = matches.filter((match) => this.isMemberInMatch(member.name, match));
      const wins = memberMatches.filter((match) => match.result === 'WIN').length;
      const matchCount = memberMatches.length;
      const winRate = matchCount ? Math.round((wins / matchCount) * 100) : 0;
      return {
        name: member.name,
        role: member.role,
        position: member.position,
        matchCount,
        wins,
        losses: matchCount - wins,
        winRate,
        barWidth: `${Math.max(8, winRate)}%`,
      };
    });
    return rankings.sort((a: any, b: any) => {
      if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
      return b.winRate - a.winRate;
    }).map((item: any, index: number) => ({ ...item, rankNo: index + 1 }));
  },

  isMemberInMatch(name: string, match: any) {
    if (name === 'iDebater') return true;
    const teammates = match.teammates || [];
    return teammates.some((player: any) => player.name === name);
  },

  toCreateTeam() {
    wx.navigateTo({ url: '/pages/team/create' });
  },

  toJoinTeam() {
    wx.navigateTo({ url: '/pages/team/join' });
  },

  toDetail(event: any) {
    const id = event.currentTarget.dataset.id;
    if (!id) {
      wx.showToast({ title: '队伍信息缺失', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: `/pages/team-detail/index?id=${id}` });
  },
});
