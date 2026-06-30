# iDebate

iDebate 是面向高校辩手的微信小程序，提供个人比赛档案、能力画像、月度报告、队友互评、队伍管理和阵容记录等功能。

当前仓库采用 Monorepo 结构，包含微信小程序、NestJS API、Prisma 数据模型和 Docker 部署配置。

## 功能

- 微信用户资料与辩手主页
- 比赛记录新增、编辑、删除和详情查看
- 胜率、辩位、能力画像与成长数据
- 月度辩论报告
- 可选队友互评
- 称号系统
- 多队伍创建、邀请码加入和成员管理
- 队长权限、成员移除和队长转让
- 队伍比赛统计、胜负图和成员排行榜
- 阵容选择与比赛成员关联
- 未来比赛启动提醒

## 技术栈

### 小程序

- 微信小程序原生开发
- TypeScript
- Vant Weapp
- ECharts

### 后端

- Node.js 20+
- NestJS 10
- Prisma 5
- MySQL 8
- Redis 7
- 腾讯云 COS
- Docker Compose

## 目录结构

```text
iDebate/
├── apps/
│   ├── api/                    # NestJS API
│   │   ├── prisma/             # Prisma Schema 与种子数据
│   │   └── src/                # 控制器、服务与数据库连接
│   └── miniprogram/
│       ├── miniprogram/        # 正式微信小程序源码
│       ├── project.config.json
│       └── package.json
├── packages/
│   └── shared/                 # 共享类型、枚举和常量
├── deploy/                     # Docker Compose、Nginx、MySQL
├── docs/                       # API、数据库、部署与产品文档
├── assets/                     # 品牌素材
├── .env.example
├── project.config.json         # 从仓库根目录导入微信开发者工具
└── package.json
```

根目录历史示例 `miniprogram/` 不属于正式源码，已通过 `.gitignore` 排除。正式小程序入口为：

```text
apps/miniprogram/miniprogram/
```

## 当前运行模式

小程序目前默认启用本地 Mock：

```ts
export const ENABLE_LOCAL_MOCK = true;
```

配置文件：

```text
apps/miniprogram/miniprogram/services/config.ts
```

本地模式不需要启动后端，比赛、用户、队伍和邀请码保存在当前设备的微信 Storage 中。

> 本地邀请码不能跨设备共享。多人联网必须部署 API，并将 `ENABLE_LOCAL_MOCK` 改为 `false`。

## 微信开发者工具预览

1. 安装微信开发者工具。
2. 选择“导入项目”。
3. 项目目录选择本仓库根目录。
4. 使用自己的小程序 AppID，或先使用测试号。
5. 点击“编译”。

根目录 `project.config.json` 已指向正式小程序目录：

```text
apps/miniprogram/miniprogram/
```

如果本地缓存导致演示数据异常，可在开发者工具控制台执行：

```js
wx.clearStorageSync()
```

然后重新编译。

## 安装依赖

需要：

- Node.js 20+
- npm 10+
- Docker Desktop（启动完整后端时需要）

在仓库根目录执行：

```bash
npm install
```

生成 Prisma Client：

```bash
npm run prisma:generate
```

## 启动后端

复制环境变量：

```bash
copy .env.example .env
```

启动 MySQL 和 Redis：

```bash
docker compose -f deploy/docker-compose.yml up -d mysql redis
```

执行数据库迁移：

```bash
npm run prisma:migrate
```

启动 NestJS API：

```bash
npm run dev:api
```

默认 API 地址：

```text
http://localhost:3000/api
```

## 环境变量

不要提交真实 `.env`。请从 `.env.example` 创建本地配置：

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=mysql://idebate:idebate_password@localhost:3306/idebate
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=replace_with_a_strong_secret
WECHAT_APPID=replace_with_wechat_app_id
WECHAT_SECRET=replace_with_wechat_app_secret
COS_SECRET_ID=replace_with_tencent_cos_secret_id
COS_SECRET_KEY=replace_with_tencent_cos_secret_key
COS_BUCKET=replace_with_cos_bucket
COS_REGION=ap-guangzhou
```

## 切换多人联网

1. 将 NestJS API 部署到公共 HTTPS 域名。
2. 在微信公众平台配置 request 合法域名。
3. 修改：

```text
apps/miniprogram/miniprogram/services/config.ts
```

将：

```ts
export const ENABLE_LOCAL_MOCK = true;
```

改为：

```ts
export const ENABLE_LOCAL_MOCK = false;
```

4. 开发调试时可在微信控制台设置 API：

```js
wx.setStorageSync(
  'idebate_api_base_url',
  'https://api.your-domain.com/api'
)
```

详细说明见 [docs/deployment.md](docs/deployment.md)。

## 常用命令

```bash
# 启动 API 开发服务
npm run dev:api

# 构建 API
npm run build:api

# 生成 Prisma Client
npm run prisma:generate

# 创建数据库迁移
npm run prisma:migrate

# 写入种子数据
npm run seed

# 小程序 TypeScript 检查
npm run typecheck -w @idebate/miniprogram
```

## API 与数据库文档

- [API 文档](docs/api.md)
- [数据库设计](docs/database.md)
- [部署说明](docs/deployment.md)
- [产品说明](docs/product.md)

## GitHub 提交前检查

请确认没有提交以下内容：

- `.env`
- 微信 AppSecret
- 腾讯云 SecretId/SecretKey
- 数据库真实密码
- `project.private.config.json`
- `node_modules/`
- 本地构建产物和临时图片

可以运行：

```bash
git status
```

检查即将提交的文件。

## License

当前项目暂未指定开源许可证。公开仓库仅表示代码可见，不自动授予他人复制、修改或分发权利。
