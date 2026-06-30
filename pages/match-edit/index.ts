import { createMatch, getMatchDetail, updateMatch } from '../../services/match';
import { listMyTeams } from '../../services/team';
import { DebatePosition, DebateSide, MatchResult, TeamRecord, createEmptyMatch } from '../../services/store';
import { getProfile } from '../../services/user';
import { highlightTags, maxReviewTagCount, problemTags, ReviewTag, roleTags } from '../../services/review-tags';

const sideOptions: DebateSide[] = ['AFFIRMATIVE', 'NEGATIVE'];
const positionOptions: DebatePosition[] = ['FIRST', 'SECOND', 'THIRD', 'FOURTH'];
const resultOptions: MatchResult[] = ['WIN', 'LOSE'];
const sideLabels = ['正方', '反方'];
const positionLabels = ['一辩', '二辩', '三辩', '四辩'];
const resultLabels = ['胜', '负'];
const lineupPositions = [
  { key: 'FIRST' as DebatePosition, label: '一辩' },
  { key: 'SECOND' as DebatePosition, label: '二辩' },
  { key: 'THIRD' as DebatePosition, label: '三辩' },
  { key: 'FOURTH' as DebatePosition, label: '四辩' },
];

type TagGroup = 'highlightTags' | 'problemTags' | 'roleTags';
type SelectableTag = ReviewTag & { selected: boolean };

Page({
  data: {
    match: createEmptyMatch(),
    profile: null as any,
    teams: [] as TeamRecord[],
    teamNames: [] as string[],
    teamIndex: -1,
    currentTeam: null as TeamRecord | null,
    teamMembers: [] as any[],
    teamMemberNames: [] as string[],
    lineup: {} as Record<string, number | string>,
    lineupRows: [] as any[],
    noTeam: false,
    memberShortage: false,
    highlightTagOptions: [] as SelectableTag[],
    problemTagOptions: [] as SelectableTag[],
    roleTagOptions: [] as SelectableTag[],
    sideLabels,
    positionLabels,
    resultLabels,
    sideIndex: 0,
    positionIndex: 0,
    resultIndex: 0,
    selectedSideLabel: sideLabels[0],
    selectedPositionLabel: positionLabels[0],
    selectedResultLabel: resultLabels[0],
    opponentsText: '',
  },

  async onLoad(query: any) {
    const id = Number(query.id || 0);
    const [profile, teams, loadedMatch] = await Promise.all([
      getProfile(),
      listMyTeams() as Promise<TeamRecord[]>,
      id ? getMatchDetail(id) : Promise.resolve(createEmptyMatch()),
    ]);
    const match = loadedMatch || createEmptyMatch();
    match.highlightTags = match.highlightTags || [];
    match.problemTags = match.problemTags || [];
    match.roleTags = match.roleTags || [];
    match.lineup = match.lineup || buildLineupFromMatch(match, profile);
    const sideIndex = Math.max(0, sideOptions.indexOf(match.side));
    const positionIndex = Math.max(0, positionOptions.indexOf(match.position));
    const resultIndex = Math.max(0, resultOptions.indexOf(match.result));
    const teamIndex = findTeamIndex(teams || [], match.teamId);
    const currentTeam = teamIndex >= 0 ? teams[teamIndex] : null;
    this.setData({
      profile,
      teams: teams || [],
      teamNames: (teams || []).map((team) => team.name),
      noTeam: !teams?.length,
      match,
      teamIndex,
      currentTeam,
      sideIndex,
      positionIndex,
      resultIndex,
      selectedSideLabel: sideLabels[sideIndex],
      selectedPositionLabel: positionLabels[positionIndex],
      selectedResultLabel: resultLabels[resultIndex],
      opponentsText: (match.opponents || []).map((item) => item.name).join('、'),
      ...buildTagOptionData(match),
    });
    this.refreshTeamMembers(currentTeam, match.lineup);
  },

  onInput(event: any) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [`match.${field}`]: event.detail.value });
  },

  onScoreInput(event: any) {
    const value = Math.min(10, Math.max(1, Number(event.detail.value || 1)));
    this.setData({ 'match.score': value });
  },

  onDateChange(event: any) {
    this.setData({ 'match.matchTime': event.detail.value });
  },

  onTeamChange(event: any) {
    const index = Number(event.detail.value);
    const currentTeam = this.data.teams[index];
    this.setData({
      teamIndex: index,
      currentTeam,
      'match.teamId': currentTeam.id,
      lineup: {},
      'match.lineup': {},
    });
    this.refreshTeamMembers(currentTeam, {});
    if ((currentTeam.members || []).length < 4) {
      wx.showToast({ title: '当前队伍成员不足4人', icon: 'none' });
    }
  },

  onLineupChange(event: any) {
    const position = event.currentTarget.dataset.position as DebatePosition;
    const index = Number(event.detail.value);
    const member = this.data.teamMembers[index];
    if (!member) return;
    const lineup = { ...this.data.lineup, [position]: member.userId || member.name };
    this.setData({ lineup, 'match.lineup': lineup });
    this.refreshLineupRows(lineup);
  },

  onSideChange(event: any) {
    const index = Number(event.detail.value);
    this.setData({ sideIndex: index, selectedSideLabel: sideLabels[index], 'match.side': sideOptions[index] });
  },

  onPositionChange(event: any) {
    const index = Number(event.detail.value);
    this.setData({ positionIndex: index, selectedPositionLabel: positionLabels[index], 'match.position': positionOptions[index] });
  },

  onResultChange(event: any) {
    const index = Number(event.detail.value);
    this.setData({ resultIndex: index, selectedResultLabel: resultLabels[index], 'match.result': resultOptions[index] });
  },

  onBestDebaterChange(event: any) {
    this.setData({ 'match.isBestDebater': event.detail.value });
  },

  onOpponentsInput(event: any) {
    this.setData({ opponentsText: event.detail.value });
  },

  toCreateTeam() {
    wx.navigateTo({ url: '/pages/team/create' });
  },

  toJoinTeam() {
    wx.navigateTo({ url: '/pages/team/join' });
  },

  toggleTag(event: any) {
    const group = event.currentTarget.dataset.group as TagGroup;
    const key = event.currentTarget.dataset.key as string;
    const selected = ([...(this.data.match[group] || [])] as string[]);
    const index = selected.indexOf(key);
    if (index >= 0) {
      selected.splice(index, 1);
    } else {
      if (selected.length >= maxReviewTagCount) {
        wx.showToast({ title: '最多选择3个标签', icon: 'none' });
        return;
      }
      selected.push(key);
    }
    this.setData({ [`match.${group}`]: selected });
    this.refreshTagOptions();
  },

  refreshTagOptions() {
    this.setData(buildTagOptionData(this.data.match));
  },

  refreshTeamMembers(team: TeamRecord | null, lineup: any = this.data.lineup) {
    const members = (team?.members || []).map((member) => ({
      ...member,
      userId: member.userId || member.name,
    }));
    this.setData({
      teamMembers: members,
      teamMemberNames: members.map((member) => member.name),
      memberShortage: Boolean(team && members.length < 4),
    });
    this.refreshLineupRows(lineup);
  },

  refreshLineupRows(lineup: any = this.data.lineup) {
    const rows = lineupPositions.map((item) => {
      const value = lineup?.[item.key];
      const index = this.data.teamMembers.findIndex((member: any) => String(member.userId || member.name) === String(value));
      return {
        key: item.key,
        label: item.label,
        index: index >= 0 ? index : -1,
        selectedName: index >= 0 ? this.data.teamMembers[index].name : '请选择',
      };
    });
    this.setData({ lineupRows: rows });
  },

  async submit() {
    if (this.data.noTeam || !this.data.currentTeam) {
      wx.showToast({ title: '请先加入或创建队伍', icon: 'none' });
      return;
    }
    const participants = buildParticipants(this.data.lineup, this.data.teamMembers, this.data.profile, this.data.match);
    const teammates = participants
      .filter((participant) => String(participant.userId) !== String(this.data.profile.id))
      .map((participant) => ({ name: participant.nickname, school: this.data.currentTeam?.school || '', position: participant.position }));
    const match = {
      ...this.data.match,
      teamId: this.data.currentTeam.id,
      lineup: this.data.lineup,
      participants,
      teammates,
      opponents: parsePlayers(this.data.opponentsText, this.data.match.position),
    };
    if (!match.name || !match.eventName || !match.topic) {
      wx.showToast({ title: '请填写比赛名称、赛事名称和辩题', icon: 'none' });
      return;
    }
    try {
      if (match.id) {
        await updateMatch(match);
      } else {
        await createMatch(match);
      }
      wx.showToast({ title: '已保存' });
      wx.navigateBack();
    } catch (error: any) {
      wx.showToast({ title: error?.response?.message || error?.message || '保存失败', icon: 'none' });
    }
  },
});

function findTeamIndex(teams: TeamRecord[], teamId?: number) {
  if (!teams.length) return -1;
  if (!teamId) return 0;
  const index = teams.findIndex((team) => Number(team.id) === Number(teamId));
  return index >= 0 ? index : 0;
}

function buildLineupFromMatch(match: any, profile: any) {
  const lineup: Partial<Record<DebatePosition, number | string>> = {};
  (match.participants || []).forEach((participant: any) => {
    lineup[participant.position] = participant.userId;
  });
  if (!Object.keys(lineup).length) {
    lineup[match.position] = profile.id;
    (match.teammates || []).forEach((player: any) => {
      lineup[player.position] = player.userId || player.name;
    });
  }
  return lineup;
}

function buildParticipants(lineup: Record<string, number | string>, members: any[], profile: any, match: any) {
  const selected = lineupPositions
    .map((item) => {
      const value = lineup[item.key];
      const member = members.find((entry) => String(entry.userId || entry.name) === String(value));
      if (!member) return null;
      return {
        userId: member.userId || member.name,
        nickname: member.name,
        position: item.key,
        side: match.side,
        isCreator: String(member.userId || member.name) === String(profile.id) || member.name === profile.nickname,
      };
    })
    .filter(Boolean) as any[];
  if (!selected.some((participant) => String(participant.userId) === String(profile.id))) {
    selected.unshift({ userId: profile.id, nickname: profile.nickname, position: match.position, side: match.side, isCreator: true });
  }
  return selected;
}

function buildTagOptionData(match: any) {
  return {
    highlightTagOptions: buildTagOptions(highlightTags, match.highlightTags || []),
    problemTagOptions: buildTagOptions(problemTags, match.problemTags || []),
    roleTagOptions: buildTagOptions(roleTags, match.roleTags || []),
  };
}

function buildTagOptions(tags: ReviewTag[], selected: string[]): SelectableTag[] {
  return tags.map((tag) => ({ ...tag, selected: selected.indexOf(tag.key) >= 0 }));
}

function parsePlayers(text: string, fallbackPosition: DebatePosition) {
  return splitNames(text).map((name) => ({ name, school: '', position: fallbackPosition }));
}

function splitNames(text: string) {
  return text
    .split(/[、，,\s]+/)
    .map((name) => name.trim())
    .filter(Boolean);
}
