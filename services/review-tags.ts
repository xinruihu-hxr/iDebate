export type AbilityKey = 'argument' | 'questioning' | 'rebuttal' | 'expression' | 'teamwork' | 'stability';

export interface ReviewTag {
  key: string;
  label: string;
}

export type AbilityWeight = Partial<Record<AbilityKey, number>>;

export const maxReviewTagCount = 3;
export const maxPeerHighlightTagCount = 3;
export const maxPeerProblemTagCount = 2;

export const abilityLabelMap: Record<AbilityKey, string> = {
  argument: '立论构建',
  questioning: '质询盘问',
  rebuttal: '攻防回应',
  expression: '表达总结',
  teamwork: '团队协作',
  stability: '稳定发挥',
};

export const abilityKeys: AbilityKey[] = ['argument', 'questioning', 'rebuttal', 'expression', 'teamwork', 'stability'];

export const highlightTags: ReviewTag[] = [
  { key: 'argument_clear', label: '立论清晰' },
  { key: 'evidence_strong', label: '论据充分' },
  { key: 'question_effective', label: '质询有效' },
  { key: 'crossfire_strong', label: '盘问有压迫感' },
  { key: 'rebuttal_precise', label: '反驳到位' },
  { key: 'free_debate_active', label: '自由辩输出多' },
  { key: 'summary_powerful', label: '总结有力' },
  { key: 'teamwork_good', label: '配合队友' },
  { key: 'adapt_fast', label: '临场应变好' },
];

export const problemTags: ReviewTag[] = [
  { key: 'expression_unclear', label: '表达不够清楚' },
  { key: 'argument_weak', label: '论证支撑不足' },
  { key: 'response_slow', label: '回应不够及时' },
  { key: 'question_weak', label: '质询压迫感不足' },
  { key: 'free_debate_low', label: '自由辩参与少' },
  { key: 'summary_incomplete', label: '总结不够完整' },
  { key: 'teamwork_weak', label: '配合不够默契' },
  { key: 'rhythm_unstable', label: '节奏失控' },
];

export const peerHighlightTags: ReviewTag[] = [
  { key: 'argument_clear', label: '立论清晰' },
  { key: 'evidence_strong', label: '论据充分' },
  { key: 'question_effective', label: '质询有效' },
  { key: 'crossfire_strong', label: '盘问有压迫感' },
  { key: 'rebuttal_precise', label: '反驳到位' },
  { key: 'free_debate_active', label: '自由辩输出多' },
  { key: 'summary_powerful', label: '总结有力' },
  { key: 'teamwork_good', label: '配合默契' },
  { key: 'adapt_fast', label: '临场应变好' },
  { key: 'emotion_stable', label: '情绪稳定' },
];

export const peerProblemTags: ReviewTag[] = [
  { key: 'expression_unclear', label: '表达不够清楚' },
  { key: 'argument_weak', label: '论证支撑不足' },
  { key: 'response_slow', label: '回应不够及时' },
  { key: 'question_weak', label: '质询压迫感不足' },
  { key: 'free_debate_low', label: '自由辩参与少' },
  { key: 'summary_incomplete', label: '总结不够完整' },
  { key: 'teamwork_weak', label: '配合不够默契' },
  { key: 'rhythm_unstable', label: '节奏不稳定' },
];

export const roleTags: ReviewTag[] = [
  { key: 'main_argument', label: '负责主要立论' },
  { key: 'data_research', label: '负责资料整理' },
  { key: 'question_design', label: '负责盘问设计' },
  { key: 'free_debate_core', label: '参与核心攻防' },
  { key: 'closing_summary', label: '担任结辩总结' },
  { key: 'team_coordination', label: '负责团队协调' },
  { key: 'case_building', label: '参与体系搭建' },
  { key: 'opponent_analysis', label: '负责对方分析' },
];

export const highlightWeightMap: Record<string, AbilityWeight> = {
  argument_clear: { argument: 2, expression: 1 },
  evidence_strong: { argument: 2 },
  question_effective: { questioning: 2 },
  crossfire_strong: { questioning: 2, rebuttal: 1 },
  rebuttal_precise: { rebuttal: 2 },
  free_debate_active: { rebuttal: 2, stability: 1 },
  summary_powerful: { expression: 2 },
  teamwork_good: { teamwork: 2 },
  adapt_fast: { stability: 2, rebuttal: 1 },
};

export const problemWeightMap: Record<string, AbilityWeight> = {
  expression_unclear: { expression: -1 },
  argument_weak: { argument: -1 },
  response_slow: { rebuttal: -1, stability: -1 },
  question_weak: { questioning: -1 },
  free_debate_low: { rebuttal: -1 },
  summary_incomplete: { expression: -1 },
  teamwork_weak: { teamwork: -1 },
  rhythm_unstable: { stability: -1 },
};

export const peerScoreBonusMap: Record<number, number> = {
  1: -10,
  2: -5,
  3: 0,
  4: 5,
  5: 10,
};

export const roleWeightMap: Record<string, AbilityWeight> = {
  main_argument: { argument: 2 },
  data_research: { argument: 1, stability: 1 },
  question_design: { questioning: 2 },
  free_debate_core: { rebuttal: 2 },
  closing_summary: { expression: 2 },
  team_coordination: { teamwork: 2 },
  case_building: { argument: 1, teamwork: 1 },
  opponent_analysis: { rebuttal: 1, questioning: 1 },
};

const tagMap = [...highlightTags, ...problemTags, ...roleTags, ...peerHighlightTags, ...peerProblemTags].reduce<Record<string, string>>((map, tag) => {
  map[tag.key] = tag.label;
  return map;
}, {});

export function getReviewTagLabel(key: string): string {
  return tagMap[key] || key;
}
