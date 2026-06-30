import { ENABLE_LOCAL_MOCK, getApiBaseUrl } from './services/config';
import { ensureSeedData } from './services/store';
import { login } from './services/auth';
import { listMatches } from './services/match';

App<IAppOption>({
  onLaunch() {
    this.globalData.apiBaseUrl = getApiBaseUrl();
    this.globalData.enableLocalMock = ENABLE_LOCAL_MOCK;
    if (this.globalData.enableLocalMock) {
      ensureSeedData();
    }
    if (!this.globalData.apiBaseUrl && !this.globalData.enableLocalMock) {
      return;
    }
    wx.login({
      success: (result) => {
        login(result.code)
          .then((loginResult) => this.redirectToProfileSetupIfNeeded(loginResult.user))
          .catch(() => {
            this.showNetworkLoginError();
          });
      },
      fail: () => {
        this.showNetworkLoginError();
      },
    });
  },
  onShow() {
    if (!this.globalData.token) return;
    this.showUpcomingMatchReminder();
  },
  redirectToProfileSetupIfNeeded(profile?: any) {
    if (profile && profile.nickname && profile.school && profile.grade && profile.major) return;
    const pages = getCurrentPages();
    const currentRoute = pages[pages.length - 1]?.route || '';
    if (currentRoute === 'pages/profile/setup') return;
    wx.reLaunch({ url: '/pages/profile/setup' });
  },
  showNetworkLoginError() {
    wx.showModal({
      title: '后端连接失败',
      content: '当前小程序没有连接到可用的线上后端。请检查 API 域名、服务器部署和微信 request 合法域名配置。',
      showCancel: false,
    });
  },
  async showUpcomingMatchReminder() {
    const matches = await listMatches().catch(() => []);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingMatches = matches
      .filter((match) => new Date(match.matchTime).getTime() > today.getTime())
      .sort((a, b) => a.matchTime.localeCompare(b.matchTime));

    if (!upcomingMatches.length) return;

    const nextMatch = upcomingMatches[0];
    wx.showModal({
      title: '比赛提醒',
      content: `你有 ${upcomingMatches.length} 场未来比赛。最近一场：${nextMatch.matchTime}「${nextMatch.name || nextMatch.eventName}」`,
      confirmText: '去查看',
      cancelText: '知道了',
      success: (result) => {
        if (result.confirm) {
          wx.switchTab({ url: '/pages/match/index' });
        }
      },
    });
  },
  globalData: {
    apiBaseUrl: '',
    enableLocalMock: false,
  },
});
