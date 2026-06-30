import { listMatches } from '../../services/match';
import { login as loginWithCode } from '../../services/auth';
import { getAbilityProfileData, getMyTitles, getStatistics } from '../../services/statistics';
import { listMyTeams } from '../../services/team';
import { getProfile, updateProfile } from '../../services/user';

Page({
  data: {
    profile: null as any,
    stats: {} as any,
    titles: [] as string[],
    abilities: [] as any[],
    strengths: [] as any[],
    weaknesses: [] as any[],
    recommendedPosition: '-',
    peerReviewSupplement: 0,
    hasTagData: false,
    matches: [] as any[],
    teamName: '',
    avatarText: '我',
    isLoggedIn: false,
  },

  async onShow() {
    try {
      const [profile, stats, titles, abilityProfile, matches, teams] = await Promise.all([
        getProfile(),
        getStatistics(),
        getMyTitles(),
        getAbilityProfileData(),
        listMatches(),
        listMyTeams(),
      ]);
      this.setData({
        profile,
        stats,
        titles: titles || [],
        abilities: abilityProfile.abilities || [],
        strengths: abilityProfile.strengths || [],
        weaknesses: abilityProfile.weaknesses || [],
        recommendedPosition: abilityProfile.recommendedPosition || '-',
        peerReviewSupplement: abilityProfile.peerReviewSupplement || 0,
        hasTagData: Boolean(abilityProfile.hasTagData),
        matches: matches.slice(0, 3),
        teamName: teams[0] ? teams[0].name : '未加入队伍',
        avatarText: (profile?.nickname || '我').slice(0, 1),
        isLoggedIn: Boolean(profile && profile.id),
      });
    } catch (error) {
      this.setData({ profile: null, titles: [], avatarText: '我', isLoggedIn: false });
    }
  },

  login() {
    const app = getApp<IAppOption>();
    wx.getUserProfile({
      desc: '用于完善 iDebate 辩手头像和昵称',
      success: (profileResult) => {
        if (!app.globalData.apiBaseUrl && !app.globalData.enableLocalMock) {
          wx.showModal({
            title: '已获得微信授权',
            content: '还没有配置线上 API 域名，暂时无法完成账号登录和数据同步。请先配置后端后再登录。',
            showCancel: false,
          });
          return;
        }
        wx.login({
          success: async (loginResult) => {
            try {
              const authResult = await loginWithCode(loginResult.code);
              const user = authResult.user || ({ id: authResult.userId } as any);
              await updateProfile({
                id: user.id,
                openid: user.openid,
                unionid: user.unionid,
                nickname: profileResult.userInfo.nickName || user.nickname || 'iDebater',
                avatarUrl: profileResult.userInfo.avatarUrl || user.avatarUrl || '',
                school: user.school || '',
                grade: user.grade || '',
                major: user.major || '',
                bio: user.bio || '',
              });
              wx.showToast({ title: '登录成功' });
              await this.onShow();
              const latestProfile = this.data.profile;
              if (!latestProfile.school || !latestProfile.grade || !latestProfile.major) {
                wx.navigateTo({ url: '/pages/profile/edit' });
              }
            } catch (error: any) {
              wx.showModal({
                title: '登录失败',
                content: error?.response?.message || error?.message || '后端连接失败，请检查 API 域名和服务器状态。',
                showCancel: false,
              });
            }
          },
          fail: () => {
            wx.showToast({ title: '微信登录失败', icon: 'none' });
          },
        });
      },
      fail: () => {
        wx.showToast({ title: '你取消了微信授权', icon: 'none' });
      },
    });
  },

  toEditProfile() {
    wx.navigateTo({ url: '/pages/profile/edit' });
  },

  toMonthlyReport() {
    wx.navigateTo({ url: '/pages/report/index' });
  },
});
