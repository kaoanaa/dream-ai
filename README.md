## AI 解梦（通义千问 DashScope）

输入梦境文本，服务端调用通义千问（DashScope）生成**结构化解梦解读**，并保存到本地 SQLite，支持查看历史记录。

### 1) 安装依赖

```bash
npm i
```

### 2) 配置环境变量

创建/编辑 `.env.local`：

```bash
DASHSCOPE_API_KEY="你的 DashScope API Key"
# 可选：默认中国站；如需国际站可改成 https://dashscope-intl.aliyuncs.com
# DASHSCOPE_BASE_URL="https://dashscope.aliyuncs.com"
```

数据库连接在 `.env` 里（Prisma CLI 使用）：默认是本地 SQLite `prisma/dev.db`，通常无需改动。

### 3) 初始化数据库（首次运行或 schema 变化时）

```bash
npx prisma migrate dev
```

### 4) 启动开发

```bash
npm run dev
```

打开 `http://localhost:3000`。

### 关键路径

- **主页**：`src/app/page.tsx`
- **解梦 API**：`src/app/api/interpret/route.ts`
- **历史 API**：`src/app/api/history/route.ts`
- **千问封装**：`src/lib/qwen.ts`
- **提示词/结构**：`src/lib/prompt.ts`
- **数据库**：`prisma/schema.prisma` / `src/lib/db.ts`

### 免责声明

解梦内容仅用于自我探索与娱乐参考，不构成医疗/心理/法律建议。
