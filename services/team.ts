import { request } from './request';
import { createTeam, getMyTeams, getTeam, getTeamJoinRequests, getTeams, joinTeamByInviteCode, removeTeamMember, reviewTeamJoinRequest, TeamRecord, transferTeamLeader, updateTeam } from './store';

export function listMyTeams() {
  return request({ url: '/team/my', fallback: () => getMyTeams() });
}

export function getTeamDetail(id: number) {
  return request({ url: `/team/${id}`, fallback: () => getTeam(id) });
}

export function updateTeamInfo(team: TeamRecord) {
  return request<TeamRecord, TeamRecord>({
    url: `/team/${team.id}`,
    method: 'PUT',
    data: team,
    fallback: () => updateTeam(team),
  });
}

export function createTeamInfo(data: { name: string; description: string; school: string; logoUrl?: string }) {
  return request<TeamRecord, typeof data>({
    url: '/team/create',
    method: 'POST',
    data,
    fallback: () => createTeam(data),
  });
}

export function listJoinRequests(teamId: number) {
  return request({
    url: `/team/${teamId}/requests`,
    fallback: () => getTeamJoinRequests(teamId),
  });
}

export function reviewJoinRequest(teamId: number, memberId: number, approved: boolean) {
  return request<{ success: boolean }, { approved: boolean }>({
    url: `/team/${teamId}/requests/${memberId}`,
    method: 'PUT',
    data: { approved },
    fallback: () => reviewTeamJoinRequest(teamId, memberId, approved),
  });
}

export function joinTeam(inviteCode: string) {
  return request({
    url: '/team/join',
    method: 'POST',
    data: { inviteCode },
    fallback: () => joinTeamByInviteCode(inviteCode),
  });
}

export function removeMember(teamId: number, name: string) {
  return request<{ success: boolean }>({
    url: `/team/${teamId}/member/${encodeURIComponent(name)}`,
    method: 'DELETE',
    fallback: () => ({ success: removeTeamMember(teamId, name) }),
  });
}

export function transferLeader(teamId: number, name: string) {
  return request<{ success: boolean; team?: TeamRecord }, { name: string }>({
    url: `/team/${teamId}/leader`,
    method: 'PUT',
    data: { name },
    fallback: () => transferTeamLeader(teamId, name),
  });
}
