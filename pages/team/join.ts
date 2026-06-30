import { joinTeam } from '../../services/team';

Page({
  data: {
    inviteCode: '',
  },

  onInput(event: any) {
    this.setData({ inviteCode: String(event.detail.value || '').trim().toUpperCase() });
  },

  async submit() {
    if (!this.data.inviteCode) {
      wx.showToast({ title: '请输入邀请码', icon: 'none' });
      return;
    }
    try {
      const result = await joinTeam(this.data.inviteCode) as any;
      if (!result.success) {
        wx.showToast({ title: result.message || '邀请码不存在', icon: 'none' });
        return;
      }
      wx.showToast({ title: '加入成功' });
      setTimeout(() => {
        if (result.team?.id) {
          wx.redirectTo({ url: `/pages/team-detail/index?id=${result.team.id}` });
        } else {
          wx.switchTab({ url: '/pages/profile/index' });
        }
      }, 300);
    } catch (error: any) {
      wx.showToast({ title: error?.response?.message || error?.message || '加入失败', icon: 'none' });
    }
  },
});
