export enum DebateSide {
  AFFIRMATIVE = 'AFFIRMATIVE',
  NEGATIVE = 'NEGATIVE',
}

export enum DebatePosition {
  FIRST = 'FIRST',
  SECOND = 'SECOND',
  THIRD = 'THIRD',
  FOURTH = 'FOURTH',
}

export enum MatchResult {
  WIN = 'WIN',
  LOSE = 'LOSE',
}

export enum MatchPlayerType {
  TEAMMATE = 'TEAMMATE',
  OPPONENT = 'OPPONENT',
}

export enum TeamRole {
  LEADER = 'LEADER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export enum TeamJoinStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum TitleRuleType {
  WIN_RATE = 'WIN_RATE',
  MATCH_COUNT = 'MATCH_COUNT',
  ABILITY_SCORE = 'ABILITY_SCORE',
}

export enum AbilityDimension {
  ARGUMENT = 'ARGUMENT',
  QUESTION = 'QUESTION',
  CROSS_EXAMINATION = 'CROSS_EXAMINATION',
  FREE_DEBATE = 'FREE_DEBATE',
  SUMMARY = 'SUMMARY',
  TEAMWORK = 'TEAMWORK',
}
