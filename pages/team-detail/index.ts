import { listMatches } from '../../services/match';
import { getStatistics } from '../../services/statistics';
import { getTeamDetail, listMyTeams, removeMember, transferLeader } from '../../services/team';

Page({
  data: {
    team: null as any,
    stats: {},
    recentMatches: [] as any[],
  },

  async onLoad(query: any) {
    await this.loadTeam(Number(query.id || 1));
  },

  async onShow() {
    if (this.data.team && this.data.team.id) {
      await this.loadTeam(this.data.team.id);
    }
  },

  async loadTeam(id: number) {
    const [teamDetail, teams, stats, matches] = await Promise.all([getTeamDetail(id), listMyTeams(), getStatistics(), listMatches()]);
    this.setData({
      team: teamDetail || teams[0],
      stats,
      recentMatches: matches.slice(0, 4),
    });
  },

  copyInviteCode() {
    wx.setClipboardData({
      data: this.data.team.inviteCode,
      success: () => wx.showToast({ title: '邀请码已复制' }),
    });
  },

  openLeaderPanel() {
    wx.showActionSheet({
      itemList: ['修改队伍信息', '审批加入申请', '移除普通成员', '转让队长'],
      success: (result) => {
        if (result.tapIndex === 0) {
          wx.navigateTo({ url: `/pages/team-edit/index?id=${this.data.team.id}` });
        }
        if (result.tapIndex === 1) {
          wx.navigateTo({ url: `/pages/team-requests/index?id=${this.data.team.id}` });
        }
        if (result.tapIndex === 2) {
          this.openRemoveMemberPanel();
        }
        if (result.tapIndex === 3) {
          this.openTransferLeaderPanel();
        }
      },
    });
  },

  openRemoveMemberPanel() {
    const members = this.data.team.members.filter((member: any) => member.role !== '队长');
    if (!members.length) {
      wx.showToast({ title: '暂无可移除成员', icon: 'none' });
      return;
    }
    wx.showActionSheet({
      itemList: members.map((member: any) => member.name),
      success: (result) => {
        const member = members[result.tapIndex];
        wx.showModal({
          title: '移除成员',
          content: `确认移除 ${member.name}？`,
          success: async (modalResult) => {
            if (modalResult.confirm) {
              await removeMember(this.data.team.id, member.name);
              await this.loadTeam(this.data.team.id);
              wx.showToast({ title: '已移除' });
            }
          },
        });
      },
    });
  },

  openTransferLeaderPanel() {
    const members = this.data.team.members.filter((member: any) => member.role !== '队长');
    if (!members.length) {
      wx.showToast({ title: '暂无可转让成员', icon: 'none' });
      return;
    }
    wx.showActionSheet({
      itemList: members.map((member: any) => member.name),
      success: (result) => {
        const member = members[result.tapIndex];
        wx.showModal({
          title: '转让队长',
          content: `确认将队长转让给 ${member.name}？`,
          success: async (modalResult) => {
            if (modalResult.confirm) {
              await transferLeader(this.data.team.id, member.name);
              await this.loadTeam(this.data.team.id);
              wx.showToast({ title: '已转让队长' });
            }
          },
        });
      },
    });
  },

  toMemberDetail(event: any) {
    const name = encodeURIComponent(event.currentTarget.dataset.name || '');
    wx.navigateTo({ url: `/pages/team-member/index?teamId=${this.data.team.id}&name=${name}` });
  },
});
