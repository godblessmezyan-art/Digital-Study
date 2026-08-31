/**
 * 配置中心
 * 从环境变量读取，未设置时使用默认值（本地开发友好）
 */
export const config = {
  port: Number(process.env.PORT || 3000),
  env: process.env.NODE_ENV || 'development',
  // 数据库等后续接入时在此扩展，例如：
  // db: { host: process.env.DB_HOST, ... }
};
