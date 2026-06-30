import { submitPeerReview } from '../../services/peer-review';
import { maxPeerHighlightTagCount, maxPeerProblemTagCount, peerHighlightTags, peerProblemTags, ReviewTag } from '../../services/review-tags';

type TagGroup = 'peerHighlightTags' | 'peerProblemTags';
type SelectableTag = ReviewTag & { selected: boolean };

Page({
  data: {
    matchId: 0,
    targetUserId: '',
    targetName: '',
    targetPosition: 'FIRST',
    peerHighlightTags: [] as string[],
    peerProblemTags: [] as string[],
    peerScore: 0,
    comment: '',
    highlightOptions: [] as SelectableTag[],
    problemOptions: [] as SelectableTag[],
    stars: [1, 2, 3, 4, 5],
  },

  onLoad(query: any) {
    this.setData({
      matchId: Number(query.matchId || 0),
      targetUserId: decodeURIComponent(query.targetUserId || ''),
      targetName: decodeURIComponent(query.targetName || ''),
      targetPosition: decodeURIComponent(query.targetPosition || 'FIRST'),
    });
    this.refreshOptions();
  },

  toggleTag(event: any) {
    const group = event.currentTarget.dataset.group as TagGroup;
    const key = event.currentTarget.dataset.key as string;
    const limit = group === 'peerHighlightTags' ? maxPeerHighlightTagCount : maxPeerProblemTagCount;
    const message = group === 'peerHighlightTags' ? '最多选择3个亮点标签' : '最多选择2个待提升标签';
    const selected = [...(this.data[group] as string[])];
    const index = selected.indexOf(key);
    if (index >= 0) selected.splice(index, 1);
    else {
      if (selected.length >= limit) {
        wx.showToast({ title: message, icon: 'none' });
        return;
      }
      selected.push(key);
    }
    this.setData({ [group]: selected });
    this.refreshOptions();
  },

  chooseScore(event: any) {
    this.setData({ peerScore: Number(event.currentTarget.dataset.score) });
  },

  onCommentInput(event: any) {
    this.setData({ comment: String(event.detail.value || '').slice(0, 100) });
  },

  refreshOptions() {
    this.setData({
      highlightOptions: peerHighlightTags.map((tag) => ({ ...tag, selected: this.data.peerHighlightTags.indexOf(tag.key) >= 0 })),
      problemOptions: peerProblemTags.map((tag) => ({ ...tag, selected: this.data.peerProblemTags.indexOf(tag.key) >= 0 })),
    });
  },

  async submit() {
    if (!this.data.peerScore) {
      wx.showToast({ title: '请选择推荐分', icon: 'none' });
      return;
    }
    try {
      await submitPeerReview({
        matchId: this.data.matchId,
        targetUserId: this.data.targetUserId,
        targetName: this.data.targetName,
        targetPosition: this.data.targetPosition,
        peerHighlightTags: this.data.peerHighlightTags,
        peerProblemTags: this.data.peerProblemTags,
        peerScore: this.data.peerScore,
        comment: this.data.comment,
      });
      wx.showToast({ title: '评价已提交' });
      wx.navigateBack();
    } catch (error: any) {
      wx.showToast({ title: error.message || '提交失败', icon: 'none' });
    }
  },
});
