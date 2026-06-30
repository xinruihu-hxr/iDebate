import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthController, MatchController, PeerReviewController, ReportController, StatisticsController, TeamController, TitleController, UserController } from './api.controllers';
import { DataService } from './data.service';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule,
  ],
  controllers: [AuthController, UserController, MatchController, StatisticsController, TitleController, TeamController, PeerReviewController, ReportController],
  providers: [DataService],
})
export class AppModule {}
