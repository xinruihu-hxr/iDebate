import { request } from './request';
import { MatchRecord, deleteMatch, getMatch, getMatches, removeMyMatchParticipant, saveMatch } from './store';

export function listMatches() {
  return request<MatchRecord[]>({ url: '/match/list', fallback: () => getMatches() });
}

export function getMatchDetail(id: number) {
  return request<MatchRecord | undefined>({ url: `/match/${id}`, fallback: () => getMatch(id) });
}

export function createMatch(match: MatchRecord) {
  return request<MatchRecord, MatchRecord>({
    url: '/match/create',
    method: 'POST',
    data: match,
    fallback: () => {
      saveMatch(match);
      return match;
    },
  });
}

export function updateMatch(match: MatchRecord) {
  return request<MatchRecord, MatchRecord>({
    url: `/match/${match.id}`,
    method: 'PUT',
    data: match,
    fallback: () => {
      saveMatch(match);
      return match;
    },
  });
}

export function removeMatch(id: number) {
  return request<{ success: boolean }>({
    url: `/match/${id}`,
    method: 'DELETE',
    fallback: () => {
      deleteMatch(id);
      return { success: true };
    },
  });
}

export function removeMyParticipant(matchId: number) {
  return request<{ success: boolean }>({
    url: `/match/${matchId}/participant/me`,
    method: 'DELETE',
    fallback: () => removeMyMatchParticipant(matchId),
  });
}
