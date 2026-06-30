import { listMatches } from '../../services/match';
import { getPositionText, getResultText, getSideText } from '../../services/store';

Page({
  data: {
    matches: [] as any[],
  },

  async onShow() {
    const matches = await listMatches();
    this.setData({
      matches: matches.map((match) => ({
        ...match,
        sideText: getSideText(match.side),
        positionText: getPositionText(match.position),
        resultText: getResultText(match.result),
      })),
    });
  },

  toAddMatch() {
    wx.navigateTo({ url: '/pages/match-edit/index' });
  },

  toDetail(event: any) {
    wx.navigateTo({ url: `/pages/match-detail/index?id=${event.currentTarget.dataset.id}` });
  },
});
