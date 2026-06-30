# iDebate RESTful API

所有接口默认以 `/api` 为前缀。

## 认证

- `POST /auth/login`：微信登录，入参 `{ code }`，返回开发态 token 与用户信息。

## 用户

- `GET /user/profile`：获取当前用户资料。
- `PUT /user/profile`：修改当前用户资料，支持 `nickname`、`avatarUrl`、`school`、`major`、`grade`、`bio`、`unionid`。
- `GET /user/:id/home`：获取辩手主页数据。

## 比赛

- `POST /match/create`：新增比赛。
- `GET /match/list`：获取当前用户可见比赛列表，包括自己创建的比赛和阵容同步来的比赛。
- `GET /match/:id`：获取比赛详情。
- `PUT /match/:id`：编辑比赛。
- `DELETE /match/:id`：删除自己创建的比赛。
- `DELETE /match/:id/participant/me`：从队友同步来的比赛中移除自己。

比赛创建/编辑新增字段：

```json
{
  "teamId": 1,
  "lineup": {
    "FIRST": 1,
    "SECOND": 2,
    "THIRD": 3,
    "FOURTH": 4
  },
  "participants": [
    { "userId": 1, "nickname": "张三", "position": "FIRST", "side": "AFFIRMATIVE", "isCreator": true },
    { "userId": 2, "nickname": "李四", "position": "SECOND", "side": "AFFIRMATIVE", "isCreator": false }
  ]
}
```

后端会校验 `participants` 中的用户必须属于当前 `teamId`，否则返回“所选成员不属于当前队伍”。

## 统计

- `GET /statistics`：获取总场次、胜率、辩位统计等。
- `GET /statistics/ability`：获取能力数据。
- `GET /statistics/ability-profile`：获取融合自评标签与可选队友互评后的能力画像。

## 队友互评

- `GET /peer-review/match/:matchId/targets`：获取本场可选评价队友。
- `GET /peer-review/match/:matchId/status`：获取本场互评补充状态。
- `GET /peer-review/match/:matchId/received`：获取收到的队友评价。
- `POST /peer-review`：提交一条可选队友评价。

## 称号

- `GET /title/list`：获取称号列表。
- `GET /title/my`：获取当前用户称号。

## 队伍

- `GET /team/my`：获取当前用户加入的全部队伍。
- `GET /team/:id`：获取队伍详情。
- `POST /team/create`：创建队伍，创建人自动成为队长。
- `POST /team/join`：通过邀请码加入队伍，入参 `{ inviteCode }`。
- `PUT /team/:id`：队长修改队伍信息。
- `PUT /team/:id/leader`：队长转让队长身份，入参 `{ name }`。
- `GET /team/:id/requests`：获取待审批成员。
- `PUT /team/:id/requests/:memberId`：审批加入申请。
- `DELETE /team/:id/member/:name`：移除成员。

## 月度报告

- `GET /report/monthly`：获取当前用户月度报告。
- `GET /report/monthly?year=2026&month=6`：获取指定年月报告。
