import { Body, Controller, Delete, Get, Param, Post, Put, Req } from '@nestjs/common';
import { DataService } from './data.service';

function userIdFromRequest(request: any): number {
  const auth = request.headers.authorization || '';
  const match = auth.match(/dev-user-(\d+)/);
  return match ? Number(match[1]) : 1;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly dataService: DataService) {}

  @Post('login')
  login(@Body() body: { code?: string }) {
    return this.dataService.login(body.code || '');
  }
}

@Controller('user')
export class UserController {
  constructor(private readonly dataService: DataService) {}

  @Get('profile')
  profile(@Req() request: any) {
    return this.dataService.getProfile(userIdFromRequest(request));
  }

  @Put('profile')
  updateProfile(@Req() request: any, @Body() body: any) {
    return this.dataService.updateProfile(userIdFromRequest(request), body);
  }

  @Get(':id/home')
  async home(@Param('id') id: string) {
    const userId = Number(id);
    const [profile, stats, titles, abilities, matches, teams] = await Promise.all([
      this.dataService.getProfile(userId),
      this.dataService.getStatistics(userId),
      this.dataService.getTitles(userId),
      this.dataService.getAbility(userId),
      this.dataService.listMatches(userId),
      this.dataService.listTeams(),
    ]);
    return { profile, stats, titles, abilities, matches: matches.slice(0, 3), teamName: teams[0]?.name || '未加入队伍' };
  }
}

@Controller('match')
export class MatchController {
  constructor(private readonly dataService: DataService) {}

  @Post('create')
  create(@Req() request: any, @Body() body: any) {
    return this.dataService.saveMatch(userIdFromRequest(request), body);
  }

  @Get('list')
  list(@Req() request: any) {
    return this.dataService.listMatches(userIdFromRequest(request));
  }

  @Get(':id')
  detail(@Req() request: any, @Param('id') id: string) {
    return this.dataService.getMatch(userIdFromRequest(request), Number(id));
  }

  @Put(':id')
  update(@Req() request: any, @Param('id') id: string, @Body() body: any) {
    return this.dataService.saveMatch(userIdFromRequest(request), body, Number(id));
  }

  @Delete(':id')
  remove(@Req() request: any, @Param('id') id: string) {
    return this.dataService.deleteMatch(userIdFromRequest(request), Number(id));
  }

  @Delete(':id/participant/me')
  removeMyParticipant(@Req() request: any, @Param('id') id: string) {
    return this.dataService.removeMyMatchParticipant(userIdFromRequest(request), Number(id));
  }
}

@Controller('statistics')
export class StatisticsController {
  constructor(private readonly dataService: DataService) {}

  @Get()
  overview(@Req() request: any) {
    return this.dataService.getStatistics(userIdFromRequest(request));
  }

  @Get('ability')
  ability(@Req() request: any) {
    return this.dataService.getAbility(userIdFromRequest(request));
  }

  @Get('ability-profile')
  abilityProfile(@Req() request: any) {
    return this.dataService.getAbilityProfile(userIdFromRequest(request));
  }
}

@Controller('peer-review')
export class PeerReviewController {
  constructor(private readonly dataService: DataService) {}

  @Get('match/:matchId/targets')
  targets(@Req() request: any, @Param('matchId') matchId: string) {
    return this.dataService.getPeerReviewTargets(userIdFromRequest(request), Number(matchId));
  }

  @Get('match/:matchId/status')
  status(@Req() request: any, @Param('matchId') matchId: string) {
    return this.dataService.getPeerReviewStatus(userIdFromRequest(request), Number(matchId));
  }

  @Get('match/:matchId/received')
  received(@Req() request: any, @Param('matchId') matchId: string) {
    return this.dataService.getReceivedPeerReviews(userIdFromRequest(request), Number(matchId));
  }

  @Post()
  create(@Req() request: any, @Body() body: any) {
    return this.dataService.createPeerReview(userIdFromRequest(request), body);
  }
}

@Controller('title')
export class TitleController {
  constructor(private readonly dataService: DataService) {}

  @Get('my')
  my(@Req() request: any) {
    return this.dataService.getTitles(userIdFromRequest(request));
  }

  @Get('list')
  list(@Req() request: any) {
    return this.dataService.getTitles(userIdFromRequest(request));
  }
}

@Controller('team')
export class TeamController {
  constructor(private readonly dataService: DataService) {}

  @Get('my')
  my(@Req() request: any) {
    return this.dataService.listTeams(userIdFromRequest(request));
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.dataService.getTeam(Number(id));
  }

  @Post('create')
  create(@Req() request: any, @Body() body: any) {
    return this.dataService.createTeam(userIdFromRequest(request), body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.dataService.updateTeam(Number(id), body);
  }

  @Put(':id/leader')
  transferLeader(@Param('id') id: string, @Body() body: { name: string }) {
    return this.dataService.transferTeamLeader(Number(id), body.name);
  }

  @Get(':id/requests')
  requests(@Param('id') id: string) {
    return this.dataService.listJoinRequests(Number(id));
  }

  @Put(':id/requests/:memberId')
  reviewRequest(@Param('id') id: string, @Param('memberId') memberId: string, @Body() body: { approved: boolean }) {
    return this.dataService.reviewJoinRequest(Number(id), Number(memberId), Boolean(body.approved));
  }

  @Post('join')
  async join(@Req() request: any, @Body() body: { inviteCode: string }) {
    return this.dataService.joinTeam(userIdFromRequest(request), body.inviteCode);
  }

  @Delete(':id/member/:name')
  removeMember(@Param('id') id: string, @Param('name') name: string) {
    return this.dataService.removeTeamMember(Number(id), decodeURIComponent(name));
  }
}

@Controller('report')
export class ReportController {
  constructor(private readonly dataService: DataService) {}

  @Get('monthly')
  monthly(@Req() request: any) {
    const query = request.query || {};
    const now = new Date();
    const userId = query.userId ? Number(query.userId) : userIdFromRequest(request);
    const year = query.year ? Number(query.year) : now.getFullYear();
    const month = query.month ? Number(query.month) : now.getMonth() + 1;
    return this.dataService.getMonthlyReport(userId, year, month);
  }
}
