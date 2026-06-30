import { getMatchDetail, removeMatch, removeMyParticipant } from '../../services/match';
import { getPeerStatus, getReceivedReviews } from '../../services/peer-review';
import { getPositionText, getResultText, getSideText } from '../../services/store';

Page({
  data: {
    match: null as any,
    peerStatus: {
      totalTargets: 0,
      reviewedCount: 0,
      completed: false,
      remainingCount: 0,
      statusText: '',
    },
    receivedCount: 0,
  },

  async onLoad(query: any) {
    await this.loadMatch(Number(query.id));
  },

  async onShow() {
    if (this.data.match?.id) {
      await this.loadPeerReview(this.data.match.id);
    }
  },

  async loadMatch(id: number) {
    const match = await getMatchDetail(id);
    if (!match) {
      wx.showToast({ title: '比赛不存在', icon: 'none' });
      wx.navigateBack();
      return;
    }
    this.setData({
      match: {
        ...match,
        sideText: getSideText(match.side),
        positionText: getPositionText(match.position),
        resultText: getResultText(match.result),
        teammatesText: match.teammates.map((item) => `${item.name}（${getPositionText(item.position)}）`).join('、') || '未记录',
        opponentsText: match.opponents.map((item) => `${item.name}（${getPositionText(item.position)}）`).join('、') || '未记录',
      },
    });
    await this.loadPeerReview(id);
  },

  async loadPeerReview(matchId: number) {
    const [status, received] = await Promise.all([getPeerStatus(matchId), getReceivedReviews(matchId)]);
    const remainingCount = Math.max(0, status.totalTargets - status.reviewedCount);
    this.setData({
      peerStatus: {
        ...status,
        remainingCount,
        statusText: status.totalTargets === 0 ? '本场暂无可评价队友' : status.completed ? '你已评价本场所有可评价队友' : `你还可以评价 ${remainingCount} 位队友`,
      },
      receivedCount: received.reviews.length,
    });
  },

  toEdit() {
    wx.navigateTo({ url: `/pages/match-edit/index?id=${this.data.match.id}` });
  },

  toPeerReview() {
    wx.navigateTo({ url: `/pages/peer-review/index?matchId=${this.data.match.id}` });
  },

  removeMatch() {
    wx.showModal({
      title: '删除比赛',
      content: '确认删除这场比赛记录？',
      success: async (result) => {
        if (result.confirm) {
          await removeMatch(this.data.match.id);
          wx.showToast({ title: '已删除' });
          wx.navigateBack();
        }
      },
    });
  },

  removeParticipant() {
    wx.showModal({
      title: '移除关联',
      content: '确认这场比赛不是你参加的吗？移除后它不会再出现在你的比赛列表和统计中。',
      success: async (result) => {
        if (result.confirm) {
          await removeMyParticipant(this.data.match.id);
          wx.showToast({ title: '已移除关联' });
          wx.navigateBack();
        }
      },
    });
  },
});
