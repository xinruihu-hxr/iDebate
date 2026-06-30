import { listMatches } from '../../services/match';
import { getAbilityRadar, getMyTitles, getStatistics } from '../../services/statistics';
import { getPositionText, getResultText, getSideText } from '../../services/store';

Page({
  data: {
    stats: {},
    matches: [] as any[],
    titles: [] as string[],
    abilities: [] as any[],
  },

  async onShow() {
    const [matchesRaw, stats, titles, abilities] = await Promise.all([
      listMatches(),
      getStatistics(),
      getMyTitles(),
      getAbilityRadar(),
    ]);
    const matches = matchesRaw.slice(0, 3).map((match) => ({
      ...match,
      sideText: getSideText(match.side),
      positionText: getPositionText(match.position),
      resultText: getResultText(match.result),
    }));

    this.setData({
      stats,
      matches,
      titles,
      abilities,
    });
  },

  toAddMatch() {
    wx.navigateTo({ url: '/pages/match-edit/index' });
  },

  toMatchDetail(event: any) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/match-detail/index?id=${id}` });
  },
});
