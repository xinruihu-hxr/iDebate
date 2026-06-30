import { getProfile, updateProfile } from '../../services/user';

Page({
  data: {
    profile: {
      id: 0,
      nickname: '',
      avatarUrl: '',
      school: '',
      major: '',
      grade: '',
      bio: '',
    } as any,
  },

  async onLoad() {
    const profile = await getProfile();
    this.setData({ profile: { ...this.data.profile, ...profile } });
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
    wx.showToast({ title: '资料已完善' });
    setTimeout(() => {
      wx.switchTab({ url: '/pages/home/index' });
    }, 300);
  },
});
