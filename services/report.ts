import { request } from './request';
import { getMatches, getPositionText, getProfile, getTeams, MatchRecord } from './store';

export interface MonthlyReport {
  month: string;
  user: { nickname: string; avatar: string; teamName: string };
  matchCount: number;
  winCount: number;
  loseCount: number;
  winRate: number;
  mostUsedPosition: string;
  mostUsedPositionCount: number;
  bestPosition: string;
  bestPositionWinRate: number;
  bestPositionAverageScore: number;
  favoriteTeammate: string;
  favoriteTeammateMatchCount: number;
  bestLineup: { first: string; second: string; third: string; fourth: string; matchCount: number; winRate: number; averageScore: number };
  highestScoreMatch: { topic: string; score: number; result: string; position: string };
  fastestGrowingAbility: string;
  growthValue: number;
}

type AbilityKey = 'argumentScore' | 'questionScore' | 'crossExaminationScore' | 'freeDebateScore' | 'summaryScore' | 'teamworkScore';

const abilityLabels: Record<AbilityKey, string> = {
  argumentScore: '立论能力',
  questionScore: '质询能力',
  crossExaminationScore: '盘问能力',
  freeDebateScore: '自由辩能力',
  summaryScore: '总结能力',
  teamworkScore: '团队协作能力',
};

export function getMonthlyReport(year: number, month: number) {
  return request<MonthlyReport>({
    url: `/report/monthly?year=${year}&month=${month}`,
    fallback: () => buildLocalMonthlyReport(year, month),
  });
}

function buildLocalMonthlyReport(year: number, month: number): MonthlyReport {
  const profile = getProfile();
  const teams = getTeams();
  const matches = getMatches();
  const monthMatches = matches.filter((match) => isMatchInMonth(match, year, month));
  const previousMatches = matches.filter((match) => {
    const previous = new Date(year, month - 2, 1);
    return isMatchInMonth(match, previous.getFullYear(), previous.getMonth() + 1);
  });
  const winCount = monthMatches.filter((match) => match.result === 'WIN').length;
  const loseCount = monthMatches.length - winCount;
  const mostUsedPosition = mostFrequent(monthMatches.map((match) => getPositionText(match.position)));
  const teammate = favoriteTeammate(monthMatches);
  const highestScoreMatch = monthMatches.slice().sort((a, b) => b.score - a.score)[0];
  const bestPosition = calculateBestPosition(monthMatches);
  const growth = calculateFastestGrowth(monthMatches, previousMatches);

  return {
    month: `${year}年${month}月`,
    user: { nickname: profile.nickname, avatar: profile.avatarUrl, teamName: teams[0] ? teams[0].name : '未加入队伍' },
    matchCount: monthMatches.length,
    winCount,
    loseCount,
    winRate: rate(monthMatches),
    mostUsedPosition: mostUsedPosition || '-',
    mostUsedPositionCount: monthMatches.filter((match) => getPositionText(match.position) === mostUsedPosition).length,
    bestPosition: bestPosition.name,
    bestPositionWinRate: bestPosition.winRate,
    bestPositionAverageScore: bestPosition.averageScore,
    favoriteTeammate: teammate.name,
    favoriteTeammateMatchCount: teammate.count,
    bestLineup: bestLineup(monthMatches, profile.nickname),
    highestScoreMatch: highestScoreMatch
      ? { topic: highestScoreMatch.topic, score: highestScoreMatch.score, result: highestScoreMatch.result === 'WIN' ? '胜' : '负', position: getPositionText(highestScoreMatch.position) }
      : { topic: '-', score: 0, result: '-', position: '-' },
    fastestGrowingAbility: growth.name,
    growthValue: growth.value,
  };
}

function isMatchInMonth(match: MatchRecord, year: number, month: number): boolean {
  const date = new Date(match.matchTime);
  return date.getFullYear() === year && date.getMonth() + 1 === month;
}

function calculateBestPosition(matches: MatchRecord[]) {
  const positions = ['FIRST', 'SECOND', 'THIRD', 'FOURTH'] as const;
  const rows = positions.map((position) => {
    const items = matches.filter((match) => match.position === position);
    return { name: getPositionText(position), count: items.length, winRate: rate(items), averageScore: average(items.map((item) => item.score)) };
  });
  const candidates = rows.filter((item) => item.count >= 1);
  return (candidates.length ? candidates : rows).sort((a, b) => b.winRate - a.winRate || b.averageScore - a.averageScore)[0] || { name: '-', winRate: 0, averageScore: 0 };
}

function favoriteTeammate(matches: MatchRecord[]) {
  const counter = new Map<string, number>();
  matches.flatMap((match) => match.teammates).forEach((player) => counter.set(player.name, (counter.get(player.name) || 0) + 1));
  const row = Array.from(counter.entries()).sort((a, b) => b[1] - a[1])[0];
  return row ? { name: row[0], count: row[1] } : { name: '-', count: 0 };
}

function bestLineup(matches: MatchRecord[], nickname: string) {
  if (!matches.length) {
    return { first: '-', second: '-', third: '-', fourth: '-', matchCount: 0, winRate: 0, averageScore: 0 };
  }

  const keyMap = new Map<string, { names: Record<string, string>; matches: MatchRecord[] }>();
  matches.forEach((match) => {
    const names: Record<string, string> = {
      [match.position]: nickname,
    };
    match.teammates.forEach((player) => {
      names[player.position] = player.name;
    });

    const key = ['FIRST', 'SECOND', 'THIRD', 'FOURTH'].map((position) => names[position] || '-').join('|');
    const current = keyMap.get(key) || { names, matches: [] };
    current.matches.push(match);
    keyMap.set(key, current);
  });

  const best = Array.from(keyMap.values()).sort((a, b) => b.matches.length - a.matches.length || rate(b.matches) - rate(a.matches))[0];
  return {
    first: best.names.FIRST || '-',
    second: best.names.SECOND || '-',
    third: best.names.THIRD || '-',
    fourth: best.names.FOURTH || '-',
    matchCount: best.matches.length,
    winRate: rate(best.matches),
    averageScore: average(best.matches.map((match) => match.score)),
  };
}

function calculateFastestGrowth(current: MatchRecord[], previous: MatchRecord[]) {
  const keys: AbilityKey[] = ['argumentScore', 'questionScore', 'crossExaminationScore', 'freeDebateScore', 'summaryScore', 'teamworkScore'];
  const rows = keys.map((key) => {
    const currentValue = average(current.map((match) => match[key]));
    const previousValue = average(previous.map((match) => match[key]));
    return { name: abilityLabels[key], value: Math.max(0, Math.round((currentValue - previousValue) * 10) / 10) };
  });
  return rows.sort((a, b) => b.value - a.value)[0] || { name: '自由辩能力', value: 0 };
}

function mostFrequent(values: string[]): string {
  const counter = new Map<string, number>();
  values.filter(Boolean).forEach((value) => counter.set(value, (counter.get(value) || 0) + 1));
  return Array.from(counter.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
}

function rate(matches: MatchRecord[]): number {
  if (!matches.length) return 0;
  return Math.round((matches.filter((match) => match.result === 'WIN').length / matches.length) * 100);
}

function average(values: number[]): number {
  if (!values.length) return 0;
  const value = values.reduce((sum, item) => sum + item, 0) / values.length;
  return Math.round(value * 10) / 10;
}
