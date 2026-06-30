import { getProfile, updateProfile } from '../../services/user';

Page({
  data: {
    profile: null as any,
  },

  async onLoad() {
    this.setData({ profile: await getProfile() });
  },

  onInput(event: any) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [`profile.${field}`]: event.detail.value });
  },

  async submit() {
    const profile = this.data.profile;
    if (!profile.nickname || !profile.school || !profile.grade || !profile.major) {
      wx.showToast({ title: '请填写昵称、学校、年级和专业', icon: 'none' });
      return;
    }
    await updateProfile(profile);
    wx.showToast({ title: '资料已保存' });
    setTimeout(() => wx.navigateBack(), 300);
  },
});
