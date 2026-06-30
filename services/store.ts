import { abilityKeys, abilityLabelMap, AbilityKey, getReviewTagLabel, highlightTags, highlightWeightMap, peerScoreBonusMap, problemTags, problemWeightMap, roleWeightMap } from './review-tags';

export type DebateSide = 'AFFIRMATIVE' | 'NEGATIVE';
export type DebatePosition = 'FIRST' | 'SECOND' | 'THIRD' | 'FOURTH';
export type MatchResult = 'WIN' | 'LOSE';

export interface PlayerRecord {
  name: string;
  school: string;
  position: DebatePosition;
}

export interface MatchRecord {
  id: number;
  teamId?: number;
  lineup?: Partial<Record<DebatePosition, number | string>>;
  name: string;
  eventName: string;
  topic: string;
  matchTime: string;
  side: DebateSide;
  position: DebatePosition;
  result: MatchResult;
  score: number;
  isBestDebater: boolean;
  videoUrl: string;
  review: string;
  argumentScore: number;
  questionScore: number;
  crossExaminationScore: number;
  freeDebateScore: number;
  summaryScore: number;
  teamworkScore: number;
  highlightTags: string[];
  problemTags: string[];
  roleTags: string[];
  teammates: PlayerRecord[];
  opponents: PlayerRecord[];
  creatorId: number;
  creatorName: string;
  participants: { userId: number | string; nickname: string; position: DebatePosition; side?: DebateSide; isCreator: boolean; removed?: boolean }[];
  isCreator?: boolean;
  sourceText?: string;
}

export interface UserProfile {
  id: number;
  openid?: string;
  unionid?: string;
  nickname: string;
  avatarUrl: string;
  school: string;
  major: string;
  grade: string;
  bio: string;
}

export interface TeamMemberRecord {
  userId?: number | string;
  name: string;
  role: '队长' | '成员';
  position: string;
}

export interface TeamRecord {
  id: number;
  name: string;
  description: string;
  school: string;
  logoUrl?: string;
  inviteCode: string;
  members: TeamMemberRecord[];
}

export interface TeamJoinRequestRecord {
  id: number;
  teamId: number;
  name: string;
  school: string;
  major: string;
  grade: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface PeerReviewRecord {
  id: number;
  matchId: number;
  reviewerId: number;
  targetUserId: string;
  targetName: string;
  targetPosition: DebatePosition;
  peerHighlightTags: string[];
  peerProblemTags: string[];
  peerScore: number;
  comment: string;
  createdAt: string;
}

const MATCHES_KEY = 'idebate_matches';
const PROFILE_KEY = 'idebate_profile';
const TEAMS_KEY = 'idebate_teams';
const TEAM_REQUESTS_KEY = 'idebate_team_requests';
const PEER_REVIEWS_KEY = 'idebate_peer_reviews';

const positionText: Record<DebatePosition, string> = {
  FIRST: '一辩',
  SECOND: '二辩',
  THIRD: '三辩',
  FOURTH: '四辩',
};

const sideText: Record<DebateSide, string> = {
  AFFIRMATIVE: '正方',
  NEGATIVE: '反方',
};

export function getPositionText(position: DebatePosition): string {
  return positionText[position] || '-';
}

export function getSideText(side: DebateSide): string {
  return sideText[side] || '-';
}

export function getResultText(result: MatchResult): string {
  return result === 'WIN' ? '胜' : '负';
}

export function ensureSeedData(): void {
  resetCorruptedLocalData();

  if (!wx.getStorageSync(PROFILE_KEY)) {
    wx.setStorageSync(PROFILE_KEY, {
      id: 1,
      nickname: 'iDebater',
      avatarUrl: '',
      school: '星河大学',
      major: '法学',
      grade: '2026级',
      bio: '记录每一场辩论，见证每一次成长。',
    } as UserProfile);
  }

  if (!wx.getStorageSync(MATCHES_KEY)) {
    wx.setStorageSync(MATCHES_KEY, createSeedMatches());
  }

  if (!wx.getStorageSync(TEAMS_KEY)) {
    wx.setStorageSync(TEAMS_KEY, [
      {
        id: 1,
        name: '星河辩论队',
        description: '以逻辑为锋，以表达为甲。',
        school: '星河大学',
        logoUrl: '',
        inviteCode: 'IDE2026',
        members: [
          { userId: 1, name: 'iDebater', role: '队长', position: '一辩' },
          { userId: 2, name: '林澈', role: '成员', position: '二辩' },
          { userId: 3, name: '许燃', role: '成员', position: '三辩' },
          { userId: 4, name: '周屿', role: '成员', position: '四辩' },
        ],
      },
    ] as TeamRecord[]);
  }

  if (!wx.getStorageSync(TEAM_REQUESTS_KEY)) {
    wx.setStorageSync(TEAM_REQUESTS_KEY, [
      { id: 101, teamId: 1, name: '顾星', school: '星河大学', major: '新闻传播', grade: '2026级', status: 'PENDING' },
      { id: 102, teamId: 1, name: '唐棠', school: '星河大学', major: '法学', grade: '2025级', status: 'PENDING' },
    ] as TeamJoinRequestRecord[]);
  }

  if (!wx.getStorageSync(PEER_REVIEWS_KEY)) {
    wx.setStorageSync(PEER_REVIEWS_KEY, [] as PeerReviewRecord[]);
  }
}

function resetCorruptedLocalData(): void {
  const content = JSON.stringify({
    teams: wx.getStorageSync(TEAMS_KEY),
    profile: wx.getStorageSync(PROFILE_KEY),
    matches: wx.getStorageSync(MATCHES_KEY),
  });

  if (content.includes('鏄') || content.includes('杈') || content.includes('绔') || content.includes('閫')) {
    wx.removeStorageSync(TEAMS_KEY);
    wx.removeStorageSync(PROFILE_KEY);
    wx.removeStorageSync(MATCHES_KEY);
    wx.removeStorageSync(TEAM_REQUESTS_KEY);
    wx.removeStorageSync(PEER_REVIEWS_KEY);
  }
}

export function getProfile(): UserProfile {
  ensureSeedData();
  return wx.getStorageSync(PROFILE_KEY) as UserProfile;
}

export function saveProfile(profile: UserProfile): void {
  wx.setStorageSync(PROFILE_KEY, profile);
}

export function isProfileComplete(profile = getProfile()): boolean {
  return Boolean(profile.nickname && profile.school && profile.grade && profile.major);
}

export function getMatches(): MatchRecord[] {
  ensureSeedData();
  const matches = wx.getStorageSync(MATCHES_KEY) as MatchRecord[];
  const profile = getProfile();
  return matches
    .filter((match) => isVisibleToCurrentUser(match, profile))
    .map((match) => withMatchSource(match, profile))
    .sort((a, b) => b.matchTime.localeCompare(a.matchTime));
}

export function getMatch(id: number): MatchRecord | undefined {
  return getMatches().find((match) => match.id === id);
}

export function saveMatch(match: MatchRecord): void {
  const profile = getProfile();
  match.highlightTags = match.highlightTags || [];
  match.problemTags = match.problemTags || [];
  match.roleTags = match.roleTags || [];
  match.creatorId = match.creatorId || profile.id;
  match.creatorName = match.creatorName || profile.nickname;
  match.participants = buildLocalParticipants(match, profile);
  const matches = getMatches();
  const index = matches.findIndex((item) => item.id === match.id);
  if (index >= 0) {
    matches[index] = match;
  } else {
    match.id = Date.now();
    matches.unshift(match);
  }
  wx.setStorageSync(MATCHES_KEY, matches);
}

export function deleteMatch(id: number): void {
  wx.setStorageSync(MATCHES_KEY, getMatches().filter((match) => match.id !== id));
}

export function removeMyMatchParticipant(matchId: number): { success: boolean } {
  const profile = getProfile();
  const matches = wx.getStorageSync(MATCHES_KEY) as MatchRecord[];
  const match = matches.find((item) => item.id === matchId);
  if (!match) return { success: false };
  if ((match.creatorId || profile.id) === profile.id) {
    throw new Error('创建人不能移除自己的比赛记录');
  }
  match.participants = (match.participants || []).map((participant) => String(participant.userId) === String(profile.id) ? { ...participant, removed: true } : participant);
  wx.setStorageSync(MATCHES_KEY, matches);
  return { success: true };
}

export function getTeams(): TeamRecord[] {
  ensureSeedData();
  return wx.getStorageSync(TEAMS_KEY) as TeamRecord[];
}

export function getMyTeams(): TeamRecord[] {
  const profile = getProfile();
  return getTeams().filter((team) =>
    (team.members || []).some((member) => String(member.userId || member.name) === String(profile.id) || member.name === profile.nickname),
  );
}

export function saveTeams(teams: TeamRecord[]): void {
  wx.setStorageSync(TEAMS_KEY, teams);
}

export function getTeam(id: number): TeamRecord | undefined {
  return getTeams().find((team) => team.id === id);
}

export function updateTeam(team: TeamRecord): TeamRecord {
  const teams = getTeams();
  const index = teams.findIndex((item) => item.id === team.id);
  if (index >= 0) {
    teams[index] = team;
    saveTeams(teams);
  }
  return team;
}

export function createTeam(data: { name: string; description: string; school: string; logoUrl?: string }): TeamRecord {
  const profile = getProfile();
  const teams = getTeams();
  const team: TeamRecord = {
    id: Date.now(),
    name: data.name,
    description: data.description,
    school: data.school,
    logoUrl: data.logoUrl || '',
    inviteCode: createInviteCode(),
    members: [{ userId: profile.id, name: profile.nickname, role: '队长', position: '队长' }],
  };
  teams.unshift(team);
  saveTeams(teams);
  return team;
}

export function joinTeamByInviteCode(inviteCode: string): { success: boolean; team?: TeamRecord; message?: string } {
  const profile = getProfile();
  const teams = getTeams();
  const team = teams.find((item) => item.inviteCode.toUpperCase() === inviteCode.trim().toUpperCase());
  if (!team) return { success: false, message: '邀请码不存在' };
  const exists = team.members.some((member) => String(member.userId || member.name) === String(profile.id) || member.name === profile.nickname);
  if (!exists) {
    team.members.push({
      userId: profile.id,
      name: profile.nickname,
      role: '成员',
      position: '队员',
    });
    saveTeams(teams);
  }
  return { success: true, team, message: '加入成功' };
}

export function transferTeamLeader(teamId: number, name: string): { success: boolean; team?: TeamRecord } {
  const teams = getTeams();
  const team = teams.find((item) => item.id === teamId);
  if (!team) return { success: false };
  const nextLeader = team.members.find((member) => member.name === name);
  if (!nextLeader) return { success: false };
  team.members = team.members.map((member) => ({
    ...member,
    role: member.name === name ? '队长' : '成员',
  }));
  saveTeams(teams);
  return { success: true, team };
}

export function getTeamJoinRequests(teamId: number): TeamJoinRequestRecord[] {
  ensureSeedData();
  const requests = wx.getStorageSync(TEAM_REQUESTS_KEY) as TeamJoinRequestRecord[];
  return requests.filter((request) => request.teamId === teamId && request.status === 'PENDING');
}

export function reviewTeamJoinRequest(teamId: number, requestId: number, approved: boolean): { success: boolean } {
  const requests = wx.getStorageSync(TEAM_REQUESTS_KEY) as TeamJoinRequestRecord[];
  const request = requests.find((item) => item.teamId === teamId && item.id === requestId);
  if (!request) return { success: false };

  request.status = approved ? 'APPROVED' : 'REJECTED';
  wx.setStorageSync(TEAM_REQUESTS_KEY, requests);

  if (approved) {
    const teams = getTeams();
    const team = teams.find((item) => item.id === teamId);
    if (team && !team.members.find((member) => member.name === request.name)) {
      team.members.push({ userId: request.name, name: request.name, role: '成员', position: '队员' });
      saveTeams(teams);
    }
  }

  return { success: true };
}

export function getTeamMember(teamId: number, name: string): TeamMemberRecord | undefined {
  const team = getTeam(teamId);
  return team ? team.members.find((member) => member.name === name) : undefined;
}

export function removeTeamMember(teamId: number, name: string): boolean {
  const teams = getTeams();
  const team = teams.find((item) => item.id === teamId);
  if (!team) return false;
  const member = team.members.find((item) => item.name === name);
  if (!member || member.role === '队长') return false;
  team.members = team.members.filter((item) => item.name !== name);
  saveTeams(teams);
  return true;
}

function createInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'IDE';
  for (let index = 0; index < 5; index += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function isVisibleToCurrentUser(match: MatchRecord, profile: UserProfile): boolean {
  if (!match.creatorId || match.creatorId === profile.id) return true;
  return (match.participants || []).some((participant) => String(participant.userId) === String(profile.id) && !participant.removed);
}

function withMatchSource(match: MatchRecord, profile: UserProfile): MatchRecord {
  const isCreator = !match.creatorId || match.creatorId === profile.id;
  return {
    ...match,
    isCreator,
    sourceText: isCreator ? '我记录的' : '队友记录的',
  };
}

function buildLocalParticipants(match: MatchRecord, profile: UserProfile) {
  const participants = new Map<string, { userId: number | string; nickname: string; position: DebatePosition; side?: DebateSide; isCreator: boolean; removed?: boolean }>();
  participants.set(String(profile.id), { userId: profile.id, nickname: profile.nickname, position: match.position, side: match.side, isCreator: true });
  (match.participants || []).forEach((participant) => {
    if (!participant.userId) return;
    participants.set(String(participant.userId), {
      userId: participant.userId,
      nickname: participant.nickname,
      position: participant.position,
      side: participant.side || match.side,
      isCreator: Boolean(participant.isCreator),
      removed: participant.removed,
    });
  });
  const members = getTeams().flatMap((team) => team.members);
  (match.teammates || []).forEach((player) => {
    const member = members.find((item) => item.name === player.name);
    if (member) {
        participants.set(String(member.userId || member.name), { userId: member.userId || member.name, nickname: member.name, position: player.position, side: match.side, isCreator: false });
    }
  });
  return Array.from(participants.values());
}

export function getStatistics() {
  const matches = getMatches();
  const totalMatches = matches.length;
  const totalWins = matches.filter((match) => match.result === 'WIN').length;
  const totalLosses = totalMatches - totalWins;
  const positionCounts = {
    FIRST: matches.filter((match) => match.position === 'FIRST').length,
    SECOND: matches.filter((match) => match.position === 'SECOND').length,
    THIRD: matches.filter((match) => match.position === 'THIRD').length,
    FOURTH: matches.filter((match) => match.position === 'FOURTH').length,
  };
  const bestPosition = (Object.keys(positionCounts) as DebatePosition[]).sort((a, b) => positionCounts[b] - positionCounts[a])[0];
  const recentTime = Date.now() - 30 * 24 * 60 * 60 * 1000;

  return {
    totalMatches,
    totalWins,
    totalLosses,
    winRate: totalMatches ? Math.round((totalWins / totalMatches) * 100) : 0,
    affirmativeWinRate: rate(matches.filter((match) => match.side === 'AFFIRMATIVE')),
    negativeWinRate: rate(matches.filter((match) => match.side === 'NEGATIVE')),
    firstPositionCount: positionCounts.FIRST,
    secondPositionCount: positionCounts.SECOND,
    thirdPositionCount: positionCounts.THIRD,
    fourthPositionCount: positionCounts.FOURTH,
    bestPosition: totalMatches ? getPositionText(bestPosition) : '-',
    recentThirtyDaysMatches: matches.filter((match) => new Date(match.matchTime).getTime() >= recentTime).length,
  };
}

export function getAbilityStats() {
  return getAbilityProfile().abilities;
}

export function getAbilityProfile() {
  const matches = getMatches();
  const peerReviews = getPeerReviews();
  const taggedMatches = matches.filter(hasReviewTags);
  const selfProfile = averageAbilityProfile(taggedMatches);
  const peerProfile = averagePeerAbilityProfile(peerReviews);
  const hasSelfData = taggedMatches.length > 0;
  const hasPeerData = peerReviews.length > 0;
  const abilityProfile = mergeAbilityProfiles(selfProfile, peerProfile, hasSelfData, hasPeerData);
  const strengths = topTags(matches.flatMap((match) => match.highlightTags || []), highlightTags.map((tag) => tag.key));
  const weaknesses = topTags(matches.flatMap((match) => match.problemTags || []), problemTags.map((tag) => tag.key));
  const recommendedPosition = recommendPosition(abilityProfile, matches);
  const reviewedMatchCount = new Set(peerReviews.map((review) => review.matchId)).size;
  const peerReviewSupplement = matches.length ? Math.round((reviewedMatchCount / matches.length) * 100) : 0;
  const abilities = abilityKeys.map((key) => ({
    key,
    label: abilityLabelMap[key],
    value: abilityProfile[key],
    width: `${Math.max(8, abilityProfile[key])}%`,
  }));
  return { abilityProfile, selfProfile, peerProfile, abilities, strengths, weaknesses, recommendedPosition, peerReviewSupplement, hasTagData: hasSelfData || hasPeerData };
}

export function getTitles(): string[] {
  const stats = getStatistics();
  const ability = getAbilityStats();
  const titles: string[] = [];
  if (stats.winRate >= 90) titles.push('辩坛战神');
  if (stats.totalMatches >= 50) titles.push('资深辩手');
  if (stats.totalMatches >= 100) titles.push('百战老兵');
  if (stats.totalMatches >= 300) titles.push('辩论宗师');
  if ((ability.find((item) => item.label === '攻防回应')?.value ?? 0) >= 90) titles.push('自由辩之王');
  if ((ability.find((item) => item.label === '质询盘问')?.value ?? 0) >= 90) titles.push('盘问猎手');
  return titles.length ? titles : ['新锐辩手'];
}

export function createEmptyMatch(): MatchRecord {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: 0,
    name: '',
    eventName: '',
    topic: '',
    matchTime: today,
    side: 'AFFIRMATIVE',
    position: 'FIRST',
    result: 'WIN',
    score: 8,
    isBestDebater: false,
    videoUrl: '',
    review: '',
    argumentScore: 8,
    questionScore: 8,
    crossExaminationScore: 8,
    freeDebateScore: 8,
    summaryScore: 8,
    teamworkScore: 8,
    highlightTags: [],
    problemTags: [],
    roleTags: [],
    teammates: [],
    opponents: [],
    creatorId: 1,
    creatorName: 'iDebater',
    participants: [],
    lineup: {},
  };
}

function rate(matches: MatchRecord[]): number {
  if (!matches.length) return 0;
  return Math.round((matches.filter((match) => match.result === 'WIN').length / matches.length) * 100);
}

function emptyAbilityProfile(): Record<AbilityKey, number> {
  return abilityKeys.reduce((profile, key) => {
    profile[key] = 0;
    return profile;
  }, {} as Record<AbilityKey, number>);
}

function hasReviewTags(match: MatchRecord): boolean {
  return Boolean((match.highlightTags || []).length || (match.problemTags || []).length || (match.roleTags || []).length);
}

function averageAbilityProfile(matches: MatchRecord[]): Record<AbilityKey, number> {
  if (!matches.length) return emptyAbilityProfile();
  const totals = emptyAbilityProfile();
  matches.map(calculateMatchAbilityProfile).forEach((profile) => {
    abilityKeys.forEach((key) => {
      totals[key] += profile[key];
    });
  });
  abilityKeys.forEach((key) => {
    totals[key] = Math.round(totals[key] / matches.length);
  });
  return totals;
}

function averagePeerAbilityProfile(reviews: PeerReviewRecord[]): Record<AbilityKey, number> {
  if (!reviews.length) return emptyAbilityProfile();
  const totals = emptyAbilityProfile();
  reviews.map(calculatePeerAbilityProfile).forEach((profile) => {
    abilityKeys.forEach((key) => {
      totals[key] += profile[key];
    });
  });
  abilityKeys.forEach((key) => {
    totals[key] = Math.round(totals[key] / reviews.length);
  });
  return totals;
}

function calculatePeerAbilityProfile(review: PeerReviewRecord): Record<AbilityKey, number> {
  const weights = emptyAbilityProfile();
  applyTagWeights(weights, review.peerHighlightTags || [], highlightWeightMap);
  applyTagWeights(weights, review.peerProblemTags || [], problemWeightMap);
  const bonus = peerScoreBonusMap[review.peerScore] || 0;
  return abilityKeys.reduce((profile, key) => {
    profile[key] = clampAbility(60 + weights[key] * 5 + bonus);
    return profile;
  }, {} as Record<AbilityKey, number>);
}

function mergeAbilityProfiles(selfProfile: Record<AbilityKey, number>, peerProfile: Record<AbilityKey, number>, hasSelfData: boolean, hasPeerData: boolean): Record<AbilityKey, number> {
  if (hasSelfData && hasPeerData) {
    return abilityKeys.reduce((profile, key) => {
      profile[key] = Math.round(selfProfile[key] * 0.6 + peerProfile[key] * 0.4);
      return profile;
    }, {} as Record<AbilityKey, number>);
  }
  if (hasPeerData) return peerProfile;
  return selfProfile;
}

function calculateMatchAbilityProfile(match: MatchRecord): Record<AbilityKey, number> {
  const weights = abilityKeys.reduce((profile, key) => {
    profile[key] = 0;
    return profile;
  }, {} as Record<AbilityKey, number>);
  applyTagWeights(weights, match.highlightTags || [], highlightWeightMap);
  applyTagWeights(weights, match.problemTags || [], problemWeightMap);
  applyTagWeights(weights, match.roleTags || [], roleWeightMap);
  return abilityKeys.reduce((profile, key) => {
    profile[key] = clampAbility(60 + weights[key] * 5);
    return profile;
  }, {} as Record<AbilityKey, number>);
}

function applyTagWeights(target: Record<AbilityKey, number>, tags: string[], weightMap: Record<string, Partial<Record<AbilityKey, number>>>): void {
  tags.forEach((tag) => {
    const weights = weightMap[tag] || {};
    abilityKeys.forEach((key) => {
      target[key] += weights[key] || 0;
    });
  });
}

function clampAbility(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function topTags(keys: string[], preferredOrder: string[]) {
  const counts = keys.reduce<Record<string, number>>((map, key) => {
    map[key] = (map[key] || 0) + 1;
    return map;
  }, {});
  return preferredOrder
    .filter((key) => counts[key])
    .map((key) => ({ key, label: getReviewTagLabel(key), count: counts[key] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}

function recommendPosition(profile: Record<AbilityKey, number>, matches: MatchRecord[]): string {
  const scores = [
    { position: '一辩', raw: 'FIRST' as DebatePosition, score: profile.argument + profile.expression + profile.stability },
    { position: '二辩', raw: 'SECOND' as DebatePosition, score: profile.questioning + profile.rebuttal + profile.stability },
    { position: '三辩', raw: 'THIRD' as DebatePosition, score: profile.rebuttal + profile.questioning + profile.teamwork },
    { position: '四辩', raw: 'FOURTH' as DebatePosition, score: profile.expression + profile.argument + profile.stability },
  ];
  const bestScore = Math.max(...scores.map((item) => item.score));
  const tied = scores.filter((item) => item.score === bestScore);
  if (tied.length === 1) return tied[0].position;
  const history = getStatistics().bestPosition;
  return tied.find((item) => item.position === history)?.position || tied[0].position;
}

export function getPeerReviews(): PeerReviewRecord[] {
  ensureSeedData();
  return (wx.getStorageSync(PEER_REVIEWS_KEY) as PeerReviewRecord[]) || [];
}

export function getPeerReviewTargets(matchId: number) {
  const match = getMatch(matchId);
  if (!match) return { matchId, targets: [] };
  const reviewed = getPeerReviews().filter((review) => review.matchId === matchId && review.reviewerId === getProfile().id);
  const targets = (match.teammates || []).map((player) => ({
    userId: player.name,
    nickname: player.name,
    avatar: '',
    position: getPositionText(player.position),
    rawPosition: player.position,
    reviewed: reviewed.some((review) => review.targetUserId === player.name),
  }));
  return { matchId, targets };
}

export function getPeerReviewStatus(matchId: number) {
  const targets = getPeerReviewTargets(matchId).targets;
  const reviewedCount = targets.filter((target) => target.reviewed).length;
  return { matchId, totalTargets: targets.length, reviewedCount, completed: targets.length > 0 && reviewedCount === targets.length };
}

export function getReceivedPeerReviews(matchId: number) {
  const reviews = getPeerReviews().filter((review) => review.matchId === matchId);
  return {
    reviews: reviews.map((review) => ({
      peerHighlightTags: review.peerHighlightTags,
      peerProblemTags: review.peerProblemTags,
      peerScore: review.peerScore,
      comment: review.comment,
      createdAt: review.createdAt,
    })),
  };
}

export function savePeerReview(data: Omit<PeerReviewRecord, 'id' | 'reviewerId' | 'createdAt'>) {
  const profile = getProfile();
  const reviews = getPeerReviews();
  if (data.targetUserId === String(profile.id) || data.targetUserId === profile.nickname) {
    throw new Error('不能评价自己');
  }
  if (reviews.some((review) => review.matchId === data.matchId && review.reviewerId === profile.id && review.targetUserId === data.targetUserId)) {
    throw new Error('你已经评价过这位队友');
  }
  const review: PeerReviewRecord = {
    ...data,
    id: Date.now(),
    reviewerId: profile.id,
    createdAt: new Date().toISOString(),
  };
  wx.setStorageSync(PEER_REVIEWS_KEY, [review, ...reviews]);
  return review;
}

function createSeedMatches(): MatchRecord[] {
  return [
    {
      id: 1,
      name: '黄金联赛特邀赛',
      eventName: '2026高校黄金联赛',
      topic: '人工智能是否会削弱人类的思辨能力',
      matchTime: '2026-06-10',
      side: 'AFFIRMATIVE',
      position: 'FIRST',
      result: 'WIN',
      score: 9,
      isBestDebater: true,
      videoUrl: 'https://example.com/video',
      review: '开篇定义清晰，自由辩保持压迫感，结辩需要更强的价值收束。',
      argumentScore: 9,
      questionScore: 8,
      crossExaminationScore: 9,
      freeDebateScore: 9,
      summaryScore: 8,
      teamworkScore: 9,
      highlightTags: ['argument_clear', 'free_debate_active', 'adapt_fast'],
      problemTags: ['summary_incomplete'],
      roleTags: ['main_argument', 'case_building'],
      teammates: [
        { name: '林澈', school: '星河大学', position: 'SECOND' },
        { name: '许燃', school: '星河大学', position: 'THIRD' },
        { name: '周屿', school: '星河大学', position: 'FOURTH' },
      ],
      opponents: [{ name: '陈予', school: '北川大学', position: 'FIRST' }],
    },
    {
      id: 2,
      name: '校际交流赛',
      eventName: '双城校际交流赛',
      topic: '社交媒体让人更自由还是更不自由',
      matchTime: '2026-06-05',
      side: 'NEGATIVE',
      position: 'THIRD',
      result: 'WIN',
      score: 8,
      isBestDebater: false,
      videoUrl: '',
      review: '盘问拆解有效，攻防转换流畅。',
      argumentScore: 8,
      questionScore: 8,
      crossExaminationScore: 9,
      freeDebateScore: 8,
      summaryScore: 8,
      teamworkScore: 9,
      highlightTags: ['crossfire_strong', 'rebuttal_precise', 'teamwork_good'],
      problemTags: ['response_slow'],
      roleTags: ['free_debate_core', 'opponent_analysis'],
      teammates: [
        { name: '林澈', school: '星河大学', position: 'FIRST' },
        { name: '许燃', school: '星河大学', position: 'SECOND' },
        { name: '周屿', school: '星河大学', position: 'FOURTH' },
      ],
      opponents: [{ name: '江临', school: '南沣大学', position: 'SECOND' }],
    },
    {
      id: 3,
      name: '新生杯半决赛',
      eventName: '星河大学新生杯',
      topic: '大学教育更应培养专才还是通才',
      matchTime: '2026-05-28',
      side: 'AFFIRMATIVE',
      position: 'SECOND',
      result: 'LOSE',
      score: 7,
      isBestDebater: false,
      videoUrl: '',
      review: '质询节奏不错，但对反方核心标准回应偏晚。',
      argumentScore: 7,
      questionScore: 8,
      crossExaminationScore: 7,
      freeDebateScore: 7,
      summaryScore: 7,
      teamworkScore: 8,
      highlightTags: ['question_effective'],
      problemTags: ['response_slow', 'rhythm_unstable'],
      roleTags: ['question_design'],
      teammates: [{ name: '林澈', school: '星河大学', position: 'FIRST' }],
      opponents: [{ name: '梁今', school: '星河大学', position: 'THIRD' }],
    },
  ];
}
