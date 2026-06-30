import { getTeamDetail, listJoinRequests, reviewJoinRequest } from '../../services/team';

Page({
  data: {
    team: null as any,
    requests: [] as any[],
    hasNoRequests: false,
  },

  async onLoad(query: any) {
    await this.loadRequests(Number(query.id || 1));
  },

  async loadRequests(teamId: number) {
    const [team, requests] = await Promise.all([getTeamDetail(teamId), listJoinRequests(teamId)]);
    this.setData({ team, requests, hasNoRequests: requests.length === 0 });
  },

  async approve(event: any) {
    await this.review(event.currentTarget.dataset.id, true);
  },

  async reject(event: any) {
    await this.review(event.currentTarget.dataset.id, false);
  },

  async review(memberId: number, approved: boolean) {
    await reviewJoinRequest(this.data.team.id, Number(memberId), approved);
    wx.showToast({ title: approved ? '已通过' : '已拒绝' });
    await this.loadRequests(this.data.team.id);
  },
});
