import { defineConfig } from 'vite';

// 数字书房 · 前端构建配置
// 线上部署在 https://wxhappylife.top/test/ 子路径，因此生产构建 base 为 '/test/'
// 本地开发（vite dev）保持根路径 '/'，便于直接访问 http://localhost:5173
// 如需覆盖，可设置环境变量 VITE_BASE（如 $env:VITE_BASE='/test/'）
export default defineConfig(({ command }) => {
  const isBuild = command === 'build';
  const base = process.env.VITE_BASE || (isBuild ? '/test/' : '/');
  return {
    base,
    server: {
      port: 5173,
      open: false,
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  };
});
