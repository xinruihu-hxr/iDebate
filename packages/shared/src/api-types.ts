import { DebatePosition, DebateSide, MatchResult } from './enums';

export interface AbilityScores {
  argumentScore: number;
  questionScore: number;
  crossExaminationScore: number;
  freeDebateScore: number;
  summaryScore: number;
  teamworkScore: number;
}

export interface MatchSummary extends AbilityScores {
  id: number;
  name: string;
  eventName: string;
  topic: string;
  matchTime: string;
  side: DebateSide;
  position: DebatePosition;
  result: MatchResult;
  score: number;
  isBestDebater: boolean;
}

export interface StatisticsOverview {
  totalMatches: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  affirmativeWinRate: number;
  negativeWinRate: number;
  firstPositionCount: number;
  secondPositionCount: number;
  thirdPositionCount: number;
  fourthPositionCount: number;
  bestPosition: DebatePosition | null;
  recentThirtyDaysMatches: number;
}
