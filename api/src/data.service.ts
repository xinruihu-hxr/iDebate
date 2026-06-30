import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AbilityDimension, DebatePosition, DebateSide, MatchPlayerType, MatchResult, TeamJoinStatus, TeamRole, TitleRuleType } from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';
import { abilityKeys, abilityLabelMap, AbilityKey, getReviewTagLabel, highlightTags, highlightWeightMap, peerScoreBonusMap, problemTags, problemWeightMap, roleWeightMap } from './review-tags';

const DEMO_OPENID = 'idebate-demo-openid';

@Injectable()
export class DataService {
  constructor(private readonly prisma: PrismaService, private readonly configService: ConfigService) {}

  async login(code: string) {
    const session = await this.resolveWechatSession(code);
    const user = await this.ensureDemoData(session.openid, session.unionid);
    return { token: `dev-user-${user.id}`, userId: user.id, user };
  }

  async getProfile(userId = 1) {
    await this.ensureDemoData();
    return this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
  }

  async updateProfile(userId: number, data: any) {
    await this.ensureDemoData();
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        nickname: data.nickname,
        unionid: data.unionid || undefined,
        avatarUrl: data.avatarUrl || '',
        school: data.school || '',
        major: data.major || '',
        grade: data.grade || '',
        bio: data.bio || '',
      },
    });
  }

  async listMatches(userId = 1) {
    await this.ensureDemoData();
    const matches = await this.prisma.match.findMany({
      where: { OR: [{ userId }, { participants: { some: { userId } } }] },
      include: { players: true, user: true, participants: true },
      orderBy: { matchTime: 'desc' },
    });
    return matches.map((match) => this.toMatchDto(match, userId));
  }

  async getMatch(userId: number, id: number) {
    await this.ensureDemoData();
    const match = await this.prisma.match.findFirst({ where: { id, OR: [{ userId }, { participants: { some: { userId } } }] }, include: { players: true, user: true, participants: true } });
    return match ? this.toMatchDto(match, userId) : null;
  }

  async saveMatch(userId: number, data: any, id?: number) {
    await this.ensureDemoData();
    await this.validateLineupMembers(data);
    const matchData = this.toPrismaMatchData(userId, data);
    const players = [...this.playersToCreate(data.teammates, MatchPlayerType.TEAMMATE), ...this.playersToCreate(data.opponents, MatchPlayerType.OPPONENT)];

    if (id) {
      await this.prisma.matchPlayer.deleteMany({ where: { matchId: id } });
      const updated = await this.prisma.match.update({
        where: { id },
        data: { ...matchData, players: { create: players } },
        include: { players: true, user: true, participants: true },
      });
      await this.syncMatchParticipants(id, userId, data);
      const reloaded = await this.prisma.match.findUniqueOrThrow({ where: { id }, include: { players: true, user: true, participants: true } });
      return this.toMatchDto(reloaded, userId);
    }

    const created = await this.prisma.match.create({
      data: { ...matchData, players: { create: players } },
      include: { players: true, user: true, participants: true },
    });
    await this.syncMatchParticipants(created.id, userId, data);
    const reloaded = await this.prisma.match.findUniqueOrThrow({ where: { id: created.id }, include: { players: true, user: true, participants: true } });
    return this.toMatchDto(reloaded, userId);
  }

  async deleteMatch(userId: number, id: number) {
    await this.ensureDemoData();
    await this.prisma.match.deleteMany({ where: { id, userId } });
    return { success: true };
  }

  async removeMyMatchParticipant(userId: number, matchId: number) {
    await this.ensureDemoData();
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) return { success: false };
    if (match.userId === userId) throw new Error('创建人不能移除自己的比赛记录');
    await this.prisma.matchParticipant.deleteMany({ where: { matchId, userId, isCreator: false } });
    return { success: true };
  }

  async getPeerReviewTargets(userId: number, matchId: number) {
    await this.ensureDemoData();
    const match = await this.prisma.match.findUnique({ where: { id: matchId }, include: { players: true } });
    const reviews = await this.prisma.peerReview.findMany({ where: { matchId, reviewerId: userId } });
    const targets = [];
    for (const player of match?.players.filter((item) => item.type === MatchPlayerType.TEAMMATE) || []) {
      const user = await this.prisma.user.findFirst({ where: { nickname: player.name } });
      if (!user || user.id === userId) continue;
      targets.push({
        userId: String(user.id),
        nickname: user.nickname,
        avatar: user.avatarUrl || '',
        position: this.positionText(player.position),
        rawPosition: player.position,
        reviewed: reviews.some((review) => review.targetUserId === user.id),
      });
    }
    return { matchId, targets };
  }

  async getPeerReviewStatus(userId: number, matchId: number) {
    const result = await this.getPeerReviewTargets(userId, matchId);
    const reviewedCount = result.targets.filter((target) => target.reviewed).length;
    return { matchId, totalTargets: result.targets.length, reviewedCount, completed: result.targets.length > 0 && reviewedCount === result.targets.length };
  }

  async getReceivedPeerReviews(userId: number, matchId: number) {
    await this.ensureDemoData();
    const reviews = await this.prisma.peerReview.findMany({ where: { matchId, targetUserId: userId }, orderBy: { createdAt: 'desc' } });
    return {
      reviews: reviews.map((review) => ({
        peerHighlightTags: Array.isArray(review.peerHighlightTags) ? review.peerHighlightTags : [],
        peerProblemTags: Array.isArray(review.peerProblemTags) ? review.peerProblemTags : [],
        peerScore: review.peerScore,
        comment: review.comment || '',
        createdAt: review.createdAt,
      })),
    };
  }

  async createPeerReview(userId: number, data: any) {
    await this.ensureDemoData();
    const matchId = Number(data.matchId);
    const targetUser = Number(data.targetUserId)
      ? await this.prisma.user.findUnique({ where: { id: Number(data.targetUserId) } })
      : await this.prisma.user.findFirst({ where: { nickname: data.targetName || data.targetUserId } });
    if (!targetUser) throw new Error('被评价队友不存在');
    if (targetUser.id === userId) throw new Error('不能评价自己');
    if (Number(data.peerScore) < 1 || Number(data.peerScore) > 5) throw new Error('请选择推荐分');
    if ((data.peerHighlightTags || []).length > 3) throw new Error('最多选择3个亮点标签');
    if ((data.peerProblemTags || []).length > 2) throw new Error('最多选择2个待提升标签');
    if ((data.comment || '').length > 100) throw new Error('评价最多100字');

    const existing = await this.prisma.peerReview.findUnique({ where: { matchId_reviewerId_targetUserId: { matchId, reviewerId: userId, targetUserId: targetUser.id } } });
    if (existing) throw new Error('你已经评价过这位队友');

    const review = await this.prisma.peerReview.create({
      data: {
        matchId,
        reviewerId: userId,
        targetUserId: targetUser.id,
        peerHighlightTags: data.peerHighlightTags || [],
        peerProblemTags: data.peerProblemTags || [],
        peerScore: Number(data.peerScore),
        comment: data.comment || '',
      },
    });
    return { success: true, id: review.id };
  }

  async getStatistics(userId = 1) {
    const matches = await this.listMatches(userId);
    const totalMatches = matches.length;
    const totalWins = matches.filter((match) => match.result === MatchResult.WIN).length;
    const totalLosses = totalMatches - totalWins;
    const positionCounts = {
      FIRST: matches.filter((match) => match.position === DebatePosition.FIRST).length,
      SECOND: matches.filter((match) => match.position === DebatePosition.SECOND).length,
      THIRD: matches.filter((match) => match.position === DebatePosition.THIRD).length,
      FOURTH: matches.filter((match) => match.position === DebatePosition.FOURTH).length,
    };
    const bestPosition = (Object.keys(positionCounts) as DebatePosition[]).sort((a, b) => positionCounts[b] - positionCounts[a])[0];
    const recentTime = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return {
      totalMatches,
      totalWins,
      totalLosses,
      winRate: totalMatches ? Math.round((totalWins / totalMatches) * 100) : 0,
      affirmativeWinRate: this.rate(matches.filter((match) => match.side === DebateSide.AFFIRMATIVE)),
      negativeWinRate: this.rate(matches.filter((match) => match.side === DebateSide.NEGATIVE)),
      firstPositionCount: positionCounts.FIRST,
      secondPositionCount: positionCounts.SECOND,
      thirdPositionCount: positionCounts.THIRD,
      fourthPositionCount: positionCounts.FOURTH,
      bestPosition: totalMatches ? this.positionText(bestPosition) : '-',
      recentThirtyDaysMatches: matches.filter((match) => new Date(match.matchTime).getTime() >= recentTime).length,
    };
  }

  async getAbility(userId = 1) {
    const profile = await this.getAbilityProfile(userId);
    return profile.abilities;
  }

  async getAbilityProfile(userId = 1) {
    const matches = await this.listMatches(userId);
    const peerReviews = await this.prisma.peerReview.findMany({ where: { targetUserId: userId } });
    const taggedMatches = matches.filter((match) => this.hasReviewTags(match));
    const selfProfile = this.averageAbilityProfile(taggedMatches);
    const peerProfile = this.averagePeerAbilityProfile(peerReviews);
    const hasSelfData = taggedMatches.length > 0;
    const hasPeerData = peerReviews.length > 0;
    const abilityProfile = this.mergeAbilityProfiles(selfProfile, peerProfile, hasSelfData, hasPeerData);
    const strengths = this.topTags(matches.flatMap((match) => match.highlightTags || []), highlightTags.map((tag) => tag.key));
    const weaknesses = this.topTags(matches.flatMap((match) => match.problemTags || []), problemTags.map((tag) => tag.key));
    const recommendedPosition = this.recommendPosition(abilityProfile, matches);
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

  async getTitles(userId = 1) {
    const stats = await this.getStatistics(userId);
    const ability = await this.getAbility(userId);
    const titles: string[] = [];
    if (stats.winRate >= 90) titles.push('辩坛战神');
    if (stats.totalMatches >= 50) titles.push('资深辩手');
    if (stats.totalMatches >= 100) titles.push('百战老兵');
    if (stats.totalMatches >= 300) titles.push('辩论宗师');
    if ((ability.find((item) => item.label === '攻防回应')?.value ?? 0) >= 90) titles.push('自由辩之王');
    if ((ability.find((item) => item.label === '质询盘问')?.value ?? 0) >= 90) titles.push('盘问猎手');
    return titles.length ? titles : ['新锐辩手'];
  }

  async getMonthlyReport(userId: number, year: number, month: number) {
    await this.ensureDemoData();
    const profile = await this.getProfile(userId);
    const teams = await this.listTeams();
    const allMatches = await this.listMatches(userId);
    const monthMatches = allMatches.filter((match) => {
      const date = new Date(match.matchTime);
      return date.getFullYear() === year && date.getMonth() + 1 === month;
    });

    const winCount = monthMatches.filter((match) => match.result === MatchResult.WIN).length;
    const loseCount = monthMatches.length - winCount;
    const winRate = monthMatches.length ? Math.round((winCount / monthMatches.length) * 100) : 0;
    const mostUsedPosition = this.mostFrequent(monthMatches.map((match) => this.positionText(match.position)));
    const mostUsedPositionCount = monthMatches.filter((match) => this.positionText(match.position) === mostUsedPosition).length;
    const bestPosition = this.bestPosition(monthMatches);
    const teammate = this.favoriteTeammate(monthMatches);
    const bestLineup = this.bestLineup(monthMatches, profile.nickname);
    const highestScoreMatch = monthMatches.slice().sort((a, b) => Number(b.score) - Number(a.score))[0];
    const growth = this.fastestGrowingAbility(allMatches, year, month);

    return {
      month: `${year}年${month}月`,
      user: { nickname: profile.nickname, avatar: profile.avatarUrl || '', teamName: teams[0]?.name || '未加入队伍' },
      matchCount: monthMatches.length,
      winCount,
      loseCount,
      winRate,
      mostUsedPosition: mostUsedPosition || '-',
      mostUsedPositionCount,
      bestPosition: bestPosition.name,
      bestPositionWinRate: bestPosition.winRate,
      bestPositionAverageScore: bestPosition.averageScore,
      favoriteTeammate: teammate.name,
      favoriteTeammateMatchCount: teammate.count,
      bestLineup,
      highestScoreMatch: highestScoreMatch
        ? { topic: highestScoreMatch.topic, score: highestScoreMatch.score, result: highestScoreMatch.result === MatchResult.WIN ? '胜' : '负', position: this.positionText(highestScoreMatch.position) }
        : { topic: '-', score: 0, result: '-', position: '-' },
      fastestGrowingAbility: growth.name,
      growthValue: growth.value,
    };
  }

  async listTeams(userId?: number) {
    await this.ensureDemoData();
    const teams = await this.prisma.team.findMany({
      where: userId ? { members: { some: { userId, status: TeamJoinStatus.APPROVED } } } : undefined,
      include: { members: { include: { user: true } } },
    });
    return teams.map((team) => this.toTeamDto(team));
  }

  async joinTeam(userId: number, inviteCode: string) {
    await this.ensureDemoData();
    const team = await this.prisma.team.findUnique({
      where: { inviteCode },
      include: { members: { include: { user: true } } },
    });
    if (!team) return { success: false, message: '邀请码不存在' };
    await this.prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: team.id, userId } },
      update: { status: TeamJoinStatus.APPROVED },
      create: { teamId: team.id, userId, role: TeamRole.MEMBER, status: TeamJoinStatus.APPROVED },
    });
    const updated = await this.prisma.team.findUniqueOrThrow({ where: { id: team.id }, include: { members: { include: { user: true } } } });
    return { success: true, message: '加入成功', team: this.toTeamDto(updated) };
  }

  async getTeam(id: number) {
    await this.ensureDemoData();
    const team = await this.prisma.team.findUnique({ where: { id }, include: { members: { include: { user: true } } } });
    return team ? this.toTeamDto(team) : null;
  }

  async updateTeam(id: number, data: any) {
    await this.ensureDemoData();
    const updated = await this.prisma.team.update({
      where: { id },
      data: { name: data.name, description: data.description || '', school: data.school, logoUrl: data.logoUrl || '', inviteCode: data.inviteCode },
      include: { members: { include: { user: true } } },
    });
    return this.toTeamDto(updated);
  }

  async createTeam(userId: number, data: any) {
    await this.ensureDemoData();
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const owner = user || (await this.ensureDemoData());
    const inviteCode = await this.createInviteCode();
    const team = await this.prisma.team.create({
      data: {
        ownerId: owner.id,
        name: data.name,
        description: data.description || '',
        school: data.school || owner.school || '',
        logoUrl: data.logoUrl || '',
        inviteCode,
        members: {
          create: {
            userId: owner.id,
            role: TeamRole.LEADER,
            status: TeamJoinStatus.APPROVED,
          },
        },
      },
      include: { members: { include: { user: true } } },
    });
    return this.toTeamDto(team);
  }

  async transferTeamLeader(teamId: number, name: string) {
    await this.ensureDemoData();
    const team = await this.prisma.team.findUnique({ where: { id: teamId }, include: { members: { include: { user: true } } } });
    if (!team) return { success: false };
    const nextLeader = team.members.find((member) => member.user.nickname === name && member.status === TeamJoinStatus.APPROVED);
    if (!nextLeader) return { success: false };

    await this.prisma.$transaction([
      this.prisma.team.update({ where: { id: teamId }, data: { ownerId: nextLeader.userId } }),
      this.prisma.teamMember.updateMany({ where: { teamId }, data: { role: TeamRole.MEMBER } }),
      this.prisma.teamMember.update({ where: { id: nextLeader.id }, data: { role: TeamRole.LEADER } }),
    ]);

    const updated = await this.prisma.team.findUnique({ where: { id: teamId }, include: { members: { include: { user: true } } } });
    return { success: true, team: updated ? this.toTeamDto(updated) : null };
  }

  async listJoinRequests(teamId: number) {
    await this.ensureDemoData();
    const requests = await this.prisma.teamMember.findMany({ where: { teamId, status: TeamJoinStatus.PENDING }, include: { user: true }, orderBy: { createdAt: 'desc' } });
    return requests.map((request) => ({ id: request.id, name: request.user.nickname, school: request.user.school || '', major: request.user.major || '', grade: request.user.grade || '', status: request.status, createdAt: request.createdAt }));
  }

  async reviewJoinRequest(teamId: number, memberId: number, approved: boolean) {
    await this.ensureDemoData();
    const updated = await this.prisma.teamMember.update({ where: { id: memberId }, data: { status: approved ? TeamJoinStatus.APPROVED : TeamJoinStatus.REJECTED }, include: { user: true } });
    return { success: updated.teamId === teamId, id: updated.id, status: updated.status, name: updated.user.nickname };
  }

  async removeTeamMember(teamId: number, name: string) {
    await this.ensureDemoData();
    const team = await this.prisma.team.findUnique({ where: { id: teamId }, include: { members: { include: { user: true } } } });
    const member = team?.members.find((item) => item.user.nickname === name);
    if (!member || member.role === TeamRole.LEADER) return { success: false };
    await this.prisma.teamMember.delete({ where: { id: member.id } });
    return { success: true };
  }

  private async createInviteCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let attempt = 0; attempt < 8; attempt += 1) {
      let code = 'IDE';
      for (let index = 0; index < 5; index += 1) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      const exists = await this.prisma.team.findUnique({ where: { inviteCode: code } });
      if (!exists) return code;
    }
    return `IDE${Date.now().toString(36).toUpperCase().slice(-5)}`;
  }

  async ensureDemoData(openid = DEMO_OPENID, unionid?: string) {
    const user = await this.prisma.user.upsert({
      where: { openid },
      update: unionid ? { unionid } : {},
      create: { openid, unionid, nickname: 'iDebater', avatarUrl: '', school: '', major: '', grade: '', bio: '' },
    });
    await this.ensureTitles();
    if ((await this.prisma.match.count({ where: { userId: user.id } })) === 0) {
      for (const match of this.seedMatches()) await this.saveMatch(user.id, match);
    }
    if ((await this.prisma.team.count({ where: { ownerId: user.id } })) === 0) {
      const team = await this.prisma.team.create({ data: { ownerId: user.id, name: '星河辩论队', description: '以逻辑为锋，以表达为甲。', school: '星河大学', inviteCode: 'IDE2026' } });
      await this.prisma.teamMember.create({ data: { teamId: team.id, userId: user.id, role: TeamRole.LEADER } });
      for (const name of ['林澈', '许燃', '周屿']) {
        const member = await this.prisma.user.upsert({ where: { openid: `demo-${name}` }, update: {}, create: { openid: `demo-${name}`, nickname: name, avatarUrl: '', school: '星河大学', major: '法学', grade: '2026级', bio: '' } });
        await this.prisma.teamMember.upsert({ where: { teamId_userId: { teamId: team.id, userId: member.id } }, update: {}, create: { teamId: team.id, userId: member.id, role: TeamRole.MEMBER } });
      }
      for (const name of ['顾星', '唐棠']) {
        const applicant = await this.prisma.user.upsert({ where: { openid: `pending-${name}` }, update: {}, create: { openid: `pending-${name}`, nickname: name, avatarUrl: '', school: '星河大学', major: '新闻传播', grade: '2026级', bio: '申请加入辩论队。' } });
        await this.prisma.teamMember.upsert({ where: { teamId_userId: { teamId: team.id, userId: applicant.id } }, update: { status: TeamJoinStatus.PENDING }, create: { teamId: team.id, userId: applicant.id, role: TeamRole.MEMBER, status: TeamJoinStatus.PENDING } });
      }
    }
    await this.ensureMatchParticipants(user.id);
    return user;
  }

  private async resolveWechatSession(code: string): Promise<{ openid: string; unionid?: string }> {
    const appid = this.configService.get<string>('WECHAT_APPID') || this.configService.get<string>('WECHAT_APP_ID');
    const secret = this.configService.get<string>('WECHAT_SECRET') || this.configService.get<string>('WECHAT_APP_SECRET');
    if (!appid || !secret) {
      const env = this.configService.get<string>('NODE_ENV');
      if (env === 'production') {
        throw new Error('服务端未配置 WECHAT_APPID 或 WECHAT_SECRET');
      }
      return { openid: code ? `dev-${code}` : DEMO_OPENID };
    }

    const params = new URLSearchParams({
      appid,
      secret,
      js_code: code,
      grant_type: 'authorization_code',
    });
    const fetchFn = (globalThis as any).fetch;
    if (!fetchFn) throw new Error('当前 Node.js 版本不支持 fetch，请使用 Node.js 18 或更高版本');
    const response = await fetchFn(`https://api.weixin.qq.com/sns/jscode2session?${params.toString()}`);
    const data = await response.json();
    if (!response.ok || data.errcode || !data.openid) {
      throw new Error(data.errmsg || '微信登录失败');
    }
    return { openid: data.openid, unionid: data.unionid };
  }

  private async ensureMatchParticipants(userId: number) {
    const matches = await this.prisma.match.findMany({ where: { userId }, include: { players: true, participants: true } });
    for (const match of matches) {
      if (match.participants.length) continue;
      await this.syncMatchParticipants(match.id, userId, {
        position: match.position,
        side: match.side,
        teammates: match.players.filter((player) => player.type === MatchPlayerType.TEAMMATE),
        participants: [],
      });
    }
  }

  private async ensureTitles() {
    const titles = [
      ['辩坛战神', '胜率达到 90% 以上', TitleRuleType.WIN_RATE, null, 90],
      ['资深辩手', '累计完成 50 场比赛', TitleRuleType.MATCH_COUNT, null, 50],
      ['百战老兵', '累计完成 100 场比赛', TitleRuleType.MATCH_COUNT, null, 100],
      ['辩论宗师', '累计完成 300 场比赛', TitleRuleType.MATCH_COUNT, null, 300],
      ['自由辩之王', '自由辩平均分达到 9 分以上', TitleRuleType.ABILITY_SCORE, AbilityDimension.FREE_DEBATE, 9],
      ['盘问猎手', '盘问平均分达到 9 分以上', TitleRuleType.ABILITY_SCORE, AbilityDimension.CROSS_EXAMINATION, 9],
    ] as const;
    for (const [name, description, ruleType, abilityDimension, thresholdValue] of titles) {
      await this.prisma.title.upsert({ where: { name }, update: {}, create: { name, description, ruleType, abilityDimension, thresholdValue } });
    }
  }

  private toPrismaMatchData(userId: number, data: any) {
    return {
      userId,
      name: data.name,
      eventName: data.eventName,
      topic: data.topic,
      matchTime: new Date(data.matchTime),
      side: data.side,
      position: data.position,
      result: data.result,
      score: Number(data.score),
      isBestDebater: Boolean(data.isBestDebater),
      videoUrl: data.videoUrl || '',
      review: data.review || '',
      argumentScore: Number(data.argumentScore || 8),
      questionScore: Number(data.questionScore || 8),
      crossExaminationScore: Number(data.crossExaminationScore || 8),
      freeDebateScore: Number(data.freeDebateScore || 8),
      summaryScore: Number(data.summaryScore || 8),
      teamworkScore: Number(data.teamworkScore || 8),
      highlightTags: Array.isArray(data.highlightTags) ? data.highlightTags : [],
      problemTags: Array.isArray(data.problemTags) ? data.problemTags : [],
      roleTags: Array.isArray(data.roleTags) ? data.roleTags : [],
      teamId: data.teamId ? Number(data.teamId) : null,
    };
  }

  private playersToCreate(players: any[] = [], type: MatchPlayerType) {
    return players.map((player) => ({ type, name: player.name, school: player.school || '', position: player.position || DebatePosition.FIRST }));
  }

  private async syncMatchParticipants(matchId: number, creatorId: number, data: any) {
    const participants = new Map<number, { position: DebatePosition; side?: DebateSide; isCreator: boolean }>();
    participants.set(creatorId, { position: data.position || DebatePosition.FIRST, side: data.side, isCreator: true });

    for (const participant of data.participants || []) {
      const userId = Number(participant.userId);
      if (!userId) continue;
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('队友用户不存在');
      if (!participants.has(userId)) {
        participants.set(userId, { position: participant.position || DebatePosition.FIRST, side: participant.side || data.side, isCreator: false });
      }
    }

    for (const player of data.teammates || []) {
      const user = await this.prisma.user.findFirst({ where: { nickname: player.name } });
      if (user && !participants.has(user.id)) {
        participants.set(user.id, { position: player.position || DebatePosition.FIRST, side: data.side, isCreator: false });
      }
    }

    await this.prisma.matchParticipant.deleteMany({ where: { matchId } });
    for (const [userId, participant] of participants.entries()) {
      await this.prisma.matchParticipant.create({
        data: {
          matchId,
          userId,
          position: participant.position,
          side: participant.side,
          isCreator: participant.isCreator,
        },
      });
    }
  }

  private async validateLineupMembers(data: any) {
    if (!data.teamId || !Array.isArray(data.participants) || data.participants.length === 0) return;
    const teamId = Number(data.teamId);
    const userIds = data.participants
      .map((participant: any) => Number(participant.userId))
      .filter((userId: number) => Boolean(userId));
    if (!userIds.length) return;
    const count = await this.prisma.teamMember.count({
      where: {
        teamId,
        userId: { in: userIds },
        status: TeamJoinStatus.APPROVED,
      },
    });
    if (count !== new Set(userIds).size) {
      throw new Error('所选成员不属于当前队伍');
    }
  }

  private toMatchDto(match: any, currentUserId = match.userId) {
    const isCreator = match.userId === currentUserId;
    return {
      ...match,
      matchTime: match.matchTime.toISOString().slice(0, 10),
      teammates: match.players.filter((player: any) => player.type === MatchPlayerType.TEAMMATE),
      opponents: match.players.filter((player: any) => player.type === MatchPlayerType.OPPONENT),
      highlightTags: Array.isArray(match.highlightTags) ? match.highlightTags : [],
      problemTags: Array.isArray(match.problemTags) ? match.problemTags : [],
      roleTags: Array.isArray(match.roleTags) ? match.roleTags : [],
      creatorId: match.userId,
      creatorName: match.user?.nickname || '队友',
      isCreator,
      sourceText: isCreator ? '我记录的' : '队友记录的',
      participants: (match.participants || []).map((participant: any) => ({
        userId: participant.userId,
        position: participant.position,
        side: participant.side,
        isCreator: participant.isCreator,
      })),
    };
  }

  private toTeamDto(team: any) {
    const positions = ['一辩', '二辩', '三辩', '四辩'];
    return {
      id: team.id,
      name: team.name,
      description: team.description,
      school: team.school,
      logoUrl: team.logoUrl,
      inviteCode: team.inviteCode,
      members: team.members.filter((member: any) => member.status === TeamJoinStatus.APPROVED).map((member: any, index: number) => ({
        userId: member.userId,
        name: member.user.nickname,
        role: member.role === TeamRole.LEADER ? '队长' : member.role === TeamRole.ADMIN ? '管理员' : '成员',
        position: positions[index] || '队员',
      })),
    };
  }

  private bestPosition(matches: any[]) {
    const grouped = [DebatePosition.FIRST, DebatePosition.SECOND, DebatePosition.THIRD, DebatePosition.FOURTH].map((position) => {
      const items = matches.filter((match) => match.position === position);
      return { name: this.positionText(position), count: items.length, winRate: this.rate(items), averageScore: this.average(items.map((item) => Number(item.score))) };
    });
    const candidates = grouped.filter((item) => item.count >= 2);
    const pool = candidates.length ? candidates : grouped;
    return pool.sort((a, b) => b.winRate - a.winRate || b.averageScore - a.averageScore)[0] || { name: '-', winRate: 0, averageScore: 0 };
  }

  private favoriteTeammate(matches: any[]) {
    const counter = new Map<string, number>();
    matches.flatMap((match) => match.teammates || []).forEach((player) => counter.set(player.name, (counter.get(player.name) || 0) + 1));
    const [name, count] = Array.from(counter.entries()).sort((a, b) => b[1] - a[1])[0] || ['-', 0];
    return { name, count };
  }

  private bestLineup(matches: any[], nickname: string) {
    const lineups = matches.map((match) => {
      const names: Record<string, string> = { FIRST: '-', SECOND: '-', THIRD: '-', FOURTH: '-' };
      names[match.position] = nickname;
      (match.teammates || []).forEach((player: any) => {
        names[player.position] = player.name;
      });
      return { key: `${names.FIRST}-${names.SECOND}-${names.THIRD}-${names.FOURTH}`, names, match };
    });
    const groups = new Map<string, any[]>();
    lineups.forEach((lineup) => groups.set(lineup.key, [...(groups.get(lineup.key) || []), lineup]));
    const candidates = Array.from(groups.values()).map((items) => ({
      names: items[0].names,
      matchCount: items.length,
      winRate: this.rate(items.map((item) => item.match)),
      averageScore: this.average(items.map((item) => Number(item.match.score))),
    }));
    const repeated = candidates.filter((item) => item.matchCount >= 2);
    const selected = (repeated.length ? repeated : candidates).sort((a, b) => b.winRate - a.winRate || b.averageScore - a.averageScore)[0];
    if (!selected) return { first: '-', second: '-', third: '-', fourth: '-', matchCount: 0, winRate: 0, averageScore: 0 };
    return { first: selected.names.FIRST, second: selected.names.SECOND, third: selected.names.THIRD, fourth: selected.names.FOURTH, matchCount: selected.matchCount, winRate: selected.winRate, averageScore: selected.averageScore };
  }

  private fastestGrowingAbility(matches: any[], year: number, month: number) {
    const current = matches.filter((match) => new Date(match.matchTime).getFullYear() === year && new Date(match.matchTime).getMonth() + 1 === month);
    const previousDate = new Date(year, month - 2, 1);
    const previous = matches.filter((match) => new Date(match.matchTime).getFullYear() === previousDate.getFullYear() && new Date(match.matchTime).getMonth() === previousDate.getMonth());
    const abilities = [
      ['立论能力', 'argumentScore'],
      ['质询能力', 'questionScore'],
      ['盘问能力', 'crossExaminationScore'],
      ['自由辩能力', 'freeDebateScore'],
      ['总结能力', 'summaryScore'],
      ['团队协作', 'teamworkScore'],
    ] as const;
    const ranked = abilities.map(([name, key]) => ({ name, value: Math.round((this.average(current.map((match) => Number(match[key]))) - this.average(previous.map((match) => Number(match[key])))) * 10) / 10 }));
    return ranked.sort((a, b) => b.value - a.value)[0] || { name: '-', value: 0 };
  }

  private mostFrequent(values: string[]) {
    const counter = new Map<string, number>();
    values.forEach((value) => counter.set(value, (counter.get(value) || 0) + 1));
    return Array.from(counter.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  }

  private rate(matches: any[]): number {
    if (!matches.length) return 0;
    return Math.round((matches.filter((match) => match.result === MatchResult.WIN).length / matches.length) * 100);
  }

  private average(values: number[]): number {
    if (!values.length) return 0;
    return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
  }

  private positionText(position: DebatePosition): string {
    return { FIRST: '一辩', SECOND: '二辩', THIRD: '三辩', FOURTH: '四辩' }[position];
  }

  private emptyAbilityProfile(): Record<AbilityKey, number> {
    return abilityKeys.reduce((profile, key) => {
      profile[key] = 0;
      return profile;
    }, {} as Record<AbilityKey, number>);
  }

  private hasReviewTags(match: any) {
    return Boolean((match.highlightTags || []).length || (match.problemTags || []).length || (match.roleTags || []).length);
  }

  private averageAbilityProfile(matches: any[]): Record<AbilityKey, number> {
    if (!matches.length) return this.emptyAbilityProfile();
    const totals = this.emptyAbilityProfile();
    matches.map((match) => this.calculateMatchAbilityProfile(match)).forEach((profile) => {
      abilityKeys.forEach((key) => {
        totals[key] += profile[key];
      });
    });
    abilityKeys.forEach((key) => {
      totals[key] = Math.round(totals[key] / matches.length);
    });
    return totals;
  }

  private averagePeerAbilityProfile(reviews: any[]): Record<AbilityKey, number> {
    if (!reviews.length) return this.emptyAbilityProfile();
    const totals = this.emptyAbilityProfile();
    reviews.map((review) => this.calculatePeerAbilityProfile(review)).forEach((profile) => {
      abilityKeys.forEach((key) => {
        totals[key] += profile[key];
      });
    });
    abilityKeys.forEach((key) => {
      totals[key] = Math.round(totals[key] / reviews.length);
    });
    return totals;
  }

  private calculateMatchAbilityProfile(match: any): Record<AbilityKey, number> {
    const weights = abilityKeys.reduce((profile, key) => {
      profile[key] = 0;
      return profile;
    }, {} as Record<AbilityKey, number>);
    this.applyTagWeights(weights, match.highlightTags || [], highlightWeightMap);
    this.applyTagWeights(weights, match.problemTags || [], problemWeightMap);
    this.applyTagWeights(weights, match.roleTags || [], roleWeightMap);
    return abilityKeys.reduce((profile, key) => {
      profile[key] = Math.max(0, Math.min(100, 60 + weights[key] * 5));
      return profile;
    }, {} as Record<AbilityKey, number>);
  }

  private calculatePeerAbilityProfile(review: any): Record<AbilityKey, number> {
    const weights = abilityKeys.reduce((profile, key) => {
      profile[key] = 0;
      return profile;
    }, {} as Record<AbilityKey, number>);
    this.applyTagWeights(weights, Array.isArray(review.peerHighlightTags) ? review.peerHighlightTags : [], highlightWeightMap);
    this.applyTagWeights(weights, Array.isArray(review.peerProblemTags) ? review.peerProblemTags : [], problemWeightMap);
    const bonus = peerScoreBonusMap[Number(review.peerScore)] || 0;
    return abilityKeys.reduce((profile, key) => {
      profile[key] = Math.max(0, Math.min(100, 60 + weights[key] * 5 + bonus));
      return profile;
    }, {} as Record<AbilityKey, number>);
  }

  private mergeAbilityProfiles(selfProfile: Record<AbilityKey, number>, peerProfile: Record<AbilityKey, number>, hasSelfData: boolean, hasPeerData: boolean): Record<AbilityKey, number> {
    if (hasSelfData && hasPeerData) {
      return abilityKeys.reduce((profile, key) => {
        profile[key] = Math.round(selfProfile[key] * 0.6 + peerProfile[key] * 0.4);
        return profile;
      }, {} as Record<AbilityKey, number>);
    }
    if (hasPeerData) return peerProfile;
    return selfProfile;
  }

  private applyTagWeights(target: Record<AbilityKey, number>, tags: string[], weightMap: Record<string, Partial<Record<AbilityKey, number>>>) {
    tags.forEach((tag) => {
      const weights = weightMap[tag] || {};
      abilityKeys.forEach((key) => {
        target[key] += weights[key] || 0;
      });
    });
  }

  private topTags(keys: string[], preferredOrder: string[]) {
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

  private recommendPosition(profile: Record<AbilityKey, number>, matches: any[]) {
    const scores = [
      { position: '一辩', raw: DebatePosition.FIRST, score: profile.argument + profile.expression + profile.stability },
      { position: '二辩', raw: DebatePosition.SECOND, score: profile.questioning + profile.rebuttal + profile.stability },
      { position: '三辩', raw: DebatePosition.THIRD, score: profile.rebuttal + profile.questioning + profile.teamwork },
      { position: '四辩', raw: DebatePosition.FOURTH, score: profile.expression + profile.argument + profile.stability },
    ];
    const bestScore = Math.max(...scores.map((item) => item.score));
    const tied = scores.filter((item) => item.score === bestScore);
    if (tied.length === 1) return tied[0].position;
    const historical = [DebatePosition.FIRST, DebatePosition.SECOND, DebatePosition.THIRD, DebatePosition.FOURTH]
      .map((position) => ({ position, count: matches.filter((match) => match.position === position).length }))
      .sort((a, b) => b.count - a.count)[0]?.position;
    return tied.find((item) => item.raw === historical)?.position || tied[0].position;
  }

  private seedMatches() {
    return [
      { name: '黄金联赛特邀赛', eventName: '2026高校黄金联赛', topic: '人工智能是否会削弱人类的思辨能力', matchTime: '2026-06-10', side: DebateSide.AFFIRMATIVE, position: DebatePosition.FIRST, result: MatchResult.WIN, score: 9, isBestDebater: true, videoUrl: 'https://example.com/video', review: '开篇定义清晰，自由辩保持压迫感，结辩需要更强的价值收束。', argumentScore: 9, questionScore: 8, crossExaminationScore: 9, freeDebateScore: 9, summaryScore: 8, teamworkScore: 9, highlightTags: ['argument_clear', 'free_debate_active', 'adapt_fast'], problemTags: ['summary_incomplete'], roleTags: ['main_argument', 'case_building'], teammates: [{ name: '林澈', school: '星河大学', position: DebatePosition.SECOND }, { name: '许燃', school: '星河大学', position: DebatePosition.THIRD }], opponents: [{ name: '陈予', school: '北川大学', position: DebatePosition.FIRST }] },
      { name: '新生杯半决赛', eventName: '星河大学新生杯', topic: '大学教育更应培养专才还是通才', matchTime: '2026-06-08', side: DebateSide.NEGATIVE, position: DebatePosition.THIRD, result: MatchResult.WIN, score: 8, isBestDebater: false, videoUrl: '', review: '盘问拆解有效，攻防转换流畅。', argumentScore: 8, questionScore: 8, crossExaminationScore: 9, freeDebateScore: 8, summaryScore: 8, teamworkScore: 8, highlightTags: ['crossfire_strong', 'rebuttal_precise', 'teamwork_good'], problemTags: ['response_slow'], roleTags: ['free_debate_core', 'opponent_analysis'], teammates: [{ name: '周屿', school: '星河大学', position: DebatePosition.FOURTH }], opponents: [{ name: '梁今', school: '星河大学', position: DebatePosition.THIRD }] },
    ];
  }
}
