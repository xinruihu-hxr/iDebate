# iDebate 部署与多人试用说明

## 本地开发

1. 复制环境变量：

```bash
cp .env.example .env
```

2. 启动 MySQL 和 Redis：

```bash
docker compose -f deploy/docker-compose.yml up -d mysql redis
```

3. 安装依赖并初始化数据库：

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
```

4. 启动 API：

```bash
npm run dev:api
```

本地联调时可以在微信开发者工具的“详情 -> 本地设置”里勾选“不校验合法域名、web-view、TLS 版本以及 HTTPS 证书”。

## 多人联网必须满足的条件

多人使用时不能使用 `localhost`，也不能依赖本地缓存。所有试用者必须连接同一个线上后端。

后端需要部署到一个 HTTPS 域名，例如：

```text
https://api.your-domain.com/api
```

小程序端可以通过两种方式配置 API 地址：

1. 在微信第三方/扩展配置中设置：

```json
{
  "apiBaseUrl": "https://api.your-domain.com/api"
}
```

2. 开发调试时在控制台临时写入：

```js
wx.setStorageSync('idebate_api_base_url', 'https://api.your-domain.com/api')
```

配置完成后重新编译小程序。

## 微信公众平台配置

在“小程序后台 -> 开发管理 -> 开发设置 -> 服务器域名”中添加 request 合法域名：

```text
https://api.your-domain.com
```

体验版和正式版都必须配置合法域名，否则别人打开小程序时接口会失败。

## 后端微信登录配置

线上后端必须配置：

```env
WECHAT_APPID=你的小程序AppID
WECHAT_SECRET=你的小程序AppSecret
NODE_ENV=production
```

后端会用 `wx.login` 产生的 code 调用微信 `jscode2session`，换取稳定的 `openid` 和可选 `unionid`。这样不同用户创建、加入队伍时才会写入同一个数据库，而不是各自生成本地数据。

## 生产部署

```bash
docker compose -f deploy/docker-compose.yml up -d --build
```

上线前还需要检查：

- `DATABASE_URL`
- `REDIS_URL`
- `WECHAT_APPID`
- `WECHAT_SECRET`
- 腾讯云 COS 配置
- 线上 API 域名 HTTPS 证书
- 微信 request 合法域名

## 当前代码行为

小程序默认不会再静默回退到本地 mock 数据。如果 API 域名未配置或后端不可用，会提示“后端连接失败”。这样可以避免“我这里有邀请码，别人那里显示不存在”的假联网问题。
