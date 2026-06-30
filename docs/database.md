# iDebate 数据库设计

数据库使用 MySQL 8，ORM 使用 Prisma。完整模型位于 `apps/api/prisma/schema.prisma`。

## 核心表

- `User`：微信用户资料，`openid` 唯一。
- `Match`：比赛记录，包含结果、持方、辩位、总评分和六项能力评分。
- `MatchPlayer`：比赛中的队友和对手，通过 `type` 区分。
- `Team`：辩论队资料，包含邀请码。
- `TeamMember`：队伍成员关系、权限和加入状态。
- `Title`：称号配置和规则阈值。
- `UserTitle`：用户已获得称号。
- `Lineup`：队伍阵容模板。
- `LineupMember`：阵容成员及对应辩位。

## 统计策略

第一版统计不单独建表，直接从比赛和阵容数据聚合：

- 总场次、胜负场、胜率来自 `Match.result`。
- 正反方胜率来自 `Match.side` 和 `Match.result`。
- 辩位场次来自 `Match.position`。
- 能力雷达图来自 `Match` 六项能力评分平均值。
- 称号由后端规则引擎根据 `Title` 配置刷新 `UserTitle`。

## 约束

- 用户删除后级联删除个人比赛、队伍成员关系、称号关系和阵容成员关系。
- 队伍删除后级联删除成员与阵容。
- 比赛关联队伍或阵容被删除时置空，保留个人比赛记录。
- 同一阵容中同一辩位只能有一名用户，同一用户不能重复加入同一阵容。
