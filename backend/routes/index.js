/**
 * 路由注册中心
 * 各业务模块的路由在此挂载，新增路由请遵循：
 *   routes/<module>.js  ->  router 实例 ->  registerRoutes(app) 中挂载
 */
import { Router } from 'express';

// 示例：书架路由（后续开发时启用）
// import bookshelfRoutes from './bookshelf.js';

const router = Router();

// router.use('/bookshelf', bookshelfRoutes);

export function registerRoutes(app) {
  app.use('/api', router);
}
