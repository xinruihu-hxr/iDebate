import { createTeamInfo } from '../../services/team';
import { getProfile } from '../../services/user';

Page({
  data: {
    form: {
      name: '',
      school: '',
      description: '',
      logoUrl: '',
    },
  },

  async onLoad() {
    const profile = await getProfile();
    this.setData({ 'form.school': profile.school || '' });
  },

  onInput(event: any) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: event.detail.value });
  },

  async submit() {
    const form = this.data.form;
    if (!form.name.trim()) {
      wx.showToast({ title: '请输入队伍名称', icon: 'none' });
      return;
    }
    if (!form.school.trim()) {
      wx.showToast({ title: '请输入学校', icon: 'none' });
      return;
    }
    try {
      const team = await createTeamInfo({
        name: form.name.trim(),
        school: form.school.trim(),
        description: form.description.trim() || '新的辩论队正在集结。',
        logoUrl: form.logoUrl.trim(),
      });
      wx.showToast({ title: '创建成功' });
      setTimeout(() => wx.redirectTo({ url: `/pages/team-detail/index?id=${team.id}` }), 300);
    } catch (error: any) {
      wx.showToast({ title: error?.response?.message || error?.message || '创建失败', icon: 'none' });
    }
  },
});
