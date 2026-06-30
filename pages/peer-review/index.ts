import { listPeerReviewTargets } from '../../services/peer-review';

Page({
  data: {
    matchId: 0,
    targets: [] as any[],
  },

  async onLoad(query: any) {
    this.setData({ matchId: Number(query.matchId || 0) });
  },

  async onShow() {
    if (!this.data.matchId) return;
    const result = await listPeerReviewTargets(this.data.matchId);
    this.setData({ targets: result.targets || [] });
  },

  toForm(event: any) {
    const target = this.data.targets.find((item) => item.userId === event.currentTarget.dataset.id);
    if (!target || target.reviewed) return;
    wx.navigateTo({
      url: `/pages/peer-review/form?matchId=${this.data.matchId}&targetUserId=${encodeURIComponent(target.userId)}&targetName=${encodeURIComponent(target.nickname)}&targetPosition=${encodeURIComponent(target.rawPosition || 'FIRST')}`,
    });
  },
});
