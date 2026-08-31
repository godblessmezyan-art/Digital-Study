/**
 * 数字书房 · 后端入口
 * Node.js + Express
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { config } from '../config/index.js';
import { registerRoutes } from '../routes/index.js';

const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'digital-study-backend', time: new Date().toISOString() });
});

// 业务路由
registerRoutes(app);

// 404 兜底
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

app.listen(config.port, () => {
  console.log(`[digital-study] backend listening on http://localhost:${config.port}`);
});
