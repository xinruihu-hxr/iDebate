import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.title.upsert({
    where: { name: '辩坛战神' },
    update: {},
    create: {
      name: '辩坛战神',
      description: '胜率达到 90% 以上',
      ruleType: 'WIN_RATE',
      thresholdValue: 90,
    },
  });

  await prisma.title.upsert({
    where: { name: '资深辩手' },
    update: {},
    create: {
      name: '资深辩手',
      description: '累计完成 50 场比赛',
      ruleType: 'MATCH_COUNT',
      thresholdValue: 50,
    },
  });

  await prisma.title.upsert({
    where: { name: '百战老兵' },
    update: {},
    create: {
      name: '百战老兵',
      description: '累计完成 100 场比赛',
      ruleType: 'MATCH_COUNT',
      thresholdValue: 100,
    },
  });

  await prisma.title.upsert({
    where: { name: '辩论宗师' },
    update: {},
    create: {
      name: '辩论宗师',
      description: '累计完成 300 场比赛',
      ruleType: 'MATCH_COUNT',
      thresholdValue: 300,
    },
  });

  await prisma.title.upsert({
    where: { name: '自由辩之王' },
    update: {},
    create: {
      name: '自由辩之王',
      description: '自由辩平均分达到 9 分以上',
      ruleType: 'ABILITY_SCORE',
      abilityDimension: 'FREE_DEBATE',
      thresholdValue: 9,
    },
  });

  await prisma.title.upsert({
    where: { name: '盘问猎手' },
    update: {},
    create: {
      name: '盘问猎手',
      description: '盘问平均分达到 9 分以上',
      ruleType: 'ABILITY_SCORE',
      abilityDimension: 'CROSS_EXAMINATION',
      thresholdValue: 9,
    },
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
