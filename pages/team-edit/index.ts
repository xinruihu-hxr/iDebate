import { getTeamDetail, updateTeamInfo } from '../../services/team';

Page({
  data: {
    team: null as any,
  },

  async onLoad(query: any) {
    const team = await getTeamDetail(Number(query.id || 1));
    if (!team) {
      wx.showToast({ title: '队伍不存在', icon: 'none' });
      wx.navigateBack();
      return;
    }
    this.setData({ team });
  },

  onInput(event: any) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [`team.${field}`]: event.detail.value });
  },

  async submit() {
    const team = this.data.team;
    if (!team.name || !team.school || !team.inviteCode) {
      wx.showToast({ title: '请填写队伍名称、学校和邀请码', icon: 'none' });
      return;
    }
    await updateTeamInfo(team);
    wx.showToast({ title: '队伍已更新' });
    wx.navigateBack();
  },
});
