/**
 * 书封艺术：温暖手绘水彩插画（assets/covers/1-6.png）
 * 只按书籍已有的 cover: 1-6 取景，不改书名 / 作者 / 进度数据
 * 主题：湖畔晨光 / 金色沙丘 / 山村黄昏 / 茶馆一隅 / 林间空地 / 星夜小屋
 * 兜底：图片加载失败时露出容器的 --cover-N 渐变底色
 */

const SCENE_IDS = new Set([1, 2, 3, 4, 5, 6]);

export function coverArt(coverId) {
  const id = SCENE_IDS.has(Number(coverId)) ? Number(coverId) : 1;
  return `
    <img class="cover__img" src="/assets/covers/${id}.png" alt="" loading="lazy" decoding="async"
         onerror="this.remove()" />
  `;
}
