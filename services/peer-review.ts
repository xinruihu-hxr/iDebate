import { request } from './request';
import { getPeerReviewStatus, getPeerReviewTargets, getReceivedPeerReviews, savePeerReview } from './store';

export interface PeerReviewTarget {
  userId: string;
  nickname: string;
  avatar: string;
  position: string;
  rawPosition?: string;
  reviewed: boolean;
}

export interface PeerReviewPayload {
  matchId: number;
  targetUserId: string;
  targetName: string;
  targetPosition: any;
  peerHighlightTags: string[];
  peerProblemTags: string[];
  peerScore: number;
  comment: string;
}

export function listPeerReviewTargets(matchId: number) {
  return request<{ matchId: number; targets: PeerReviewTarget[] }>({
    url: `/peer-review/match/${matchId}/targets`,
    fallback: () => getPeerReviewTargets(matchId),
  });
}

export function getPeerStatus(matchId: number) {
  return request<{ matchId: number; totalTargets: number; reviewedCount: number; completed: boolean }>({
    url: `/peer-review/match/${matchId}/status`,
    fallback: () => getPeerReviewStatus(matchId),
  });
}

export function getReceivedReviews(matchId: number) {
  return request<{ reviews: any[] }>({
    url: `/peer-review/match/${matchId}/received`,
    fallback: () => getReceivedPeerReviews(matchId),
  });
}

export function submitPeerReview(data: PeerReviewPayload) {
  return request({
    url: '/peer-review',
    method: 'POST',
    data,
    fallback: () => savePeerReview(data),
  });
}
