import { getMonthlyReport, MonthlyReport } from '../../services/report';

Page({
  data: {
    report: null as MonthlyReport | null,
    hasReport: false,
    hasMatches: true,
    avatarText: '辩',
  },

  async onLoad() {
    const now = new Date();
    const report = await getMonthlyReport(now.getFullYear(), now.getMonth() + 1);
    const nickname = report.user.nickname || '辩手';

    this.setData({
      report,
      hasReport: true,
      hasMatches: report.matchCount > 0,
      avatarText: nickname.substring(0, 1),
    });
  },

  goRecordMatch() {
    wx.navigateTo({ url: '/pages/match-edit/index' });
  },

  backHome() {
    wx.switchTab({ url: '/pages/home/index' });
  },

  saveImage() {
    wx.showToast({ title: '保存报告图片功能将在下一版开放', icon: 'none' });
  },
});
