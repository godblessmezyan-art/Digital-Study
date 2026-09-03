/**
 * 设计图 02 的水彩风景封面（6 套暖色手绘场景）
 * 只按书籍已有的 cover: 1-6 取景，不改书名 / 作者 / 进度数据
 * 构图彼此拉开：湖畔 / 金丘 / 陶土黄昏 / 村落 / 绿野 / 远山池塘
 */

const SCENES = {
  1: `
    <svg class="cover__art" viewBox="0 0 200 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="200" height="240" fill="#EFE4C2"/>
      <circle cx="156" cy="42" r="16" fill="#F4D48A"/>
      <path d="M0 92 C36 78, 70 98, 108 74 C140 56, 168 70, 200 58 L200 240 H0 Z" fill="#C9B48A"/>
      <path d="M0 138 C48 118, 86 150, 132 126 C164 110, 184 128, 200 122 L200 240 H0 Z" fill="#A88B5C"/>
      <ellipse cx="104" cy="168" rx="72" ry="18" fill="#D4E0C8" opacity="0.55"/>
      <path d="M0 186 C60 170, 120 198, 200 178 L200 240 H0 Z" fill="#8A7350"/>
      <path d="M36 154 C48 118, 72 116, 82 154" fill="#6F9158"/>
      <path d="M58 154 v28" stroke="#6B5138" stroke-width="2.2"/>
    </svg>
  `,
  2: `
    <svg class="cover__art" viewBox="0 0 200 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="200" height="240" fill="#F7D9A0"/>
      <circle cx="38" cy="48" r="34" fill="#E8A84A"/>
      <path d="M0 108 C50 86, 90 120, 140 92 C170 74, 188 90, 200 84 L200 240 H0 Z" fill="#E2B86A"/>
      <path d="M0 158 C44 140, 96 172, 148 150 C176 138, 192 152, 200 148 L200 240 H0 Z" fill="#C48A3A"/>
      <path d="M0 198 C70 184, 130 210, 200 190 L200 240 H0 Z" fill="#A86E32"/>
    </svg>
  `,
  3: `
    <svg class="cover__art" viewBox="0 0 200 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="200" height="240" fill="#F0C8A4"/>
      <path d="M0 96 C40 80, 86 112, 128 88 C160 70, 182 90, 200 80 L200 240 H0 Z" fill="#D4926A"/>
      <path d="M0 150 C56 132, 108 168, 162 146 C182 138, 194 150, 200 148 L200 240 H0 Z" fill="#B05C42"/>
      <path d="M0 196 C80 180, 140 208, 200 188 L200 240 H0 Z" fill="#8C4634"/>
      <rect x="28" y="176" width="48" height="10" rx="2" fill="#C9A07A"/>
      <rect x="34" y="166" width="36" height="10" rx="2" fill="#A07850"/>
      <rect x="40" y="156" width="26" height="10" rx="2" fill="#8FA06E"/>
    </svg>
  `,
  4: `
    <svg class="cover__art" viewBox="0 0 200 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="200" height="240" fill="#F3D8B8"/>
      <circle cx="168" cy="40" r="14" fill="#E8B070"/>
      <path d="M0 118 C46 98, 92 128, 140 108 C168 96, 186 112, 200 104 L200 240 H0 Z" fill="#C4A07A"/>
      <path d="M0 168 C50 152, 100 184, 156 164 C178 154, 192 168, 200 164 L200 240 H0 Z" fill="#A07850"/>
      <path d="M42 148 h28 v32 H42 Z" fill="#C9A07A"/>
      <path d="M40 148 L56 128 L72 148 Z" fill="#B57A55"/>
      <path d="M86 156 h36 v24 H86 Z" fill="#D8B07A"/>
      <path d="M84 156 L104 134 L124 156 Z" fill="#C4A070"/>
      <rect x="96" y="166" width="8" height="14" fill="#8C6A48"/>
      <rect x="52" y="160" width="6" height="10" fill="#8C6A48"/>
    </svg>
  `,
  5: `
    <svg class="cover__art" viewBox="0 0 200 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="200" height="240" fill="#E4E6C4"/>
      <path d="M0 108 C48 90, 90 122, 136 98 C166 82, 186 100, 200 92 L200 240 H0 Z" fill="#B7C49A"/>
      <path d="M0 160 C54 140, 108 176, 160 154 C180 146, 194 158, 200 154 L200 240 H0 Z" fill="#8FA06E"/>
      <path d="M0 198 C70 186, 130 210, 200 192 L200 240 H0 Z" fill="#6F9158"/>
      <path d="M118 168 C108 128, 86 110, 64 96 C96 112, 118 140, 118 168 Z" fill="#6F9158"/>
      <path d="M124 168 C138 122, 164 104, 188 92 C156 116, 132 144, 124 168 Z" fill="#7A9A62"/>
      <path d="M120 168 C120 132, 128 96, 126 70 C140 104, 132 140, 120 168 Z" fill="#8AAB70"/>
      <path d="M118 168 v28" stroke="#6B5138" stroke-width="2.2"/>
    </svg>
  `,
  6: `
    <svg class="cover__art" viewBox="0 0 200 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="200" height="240" fill="#F4E8D4"/>
      <path d="M0 86 L28 48 L58 78 L92 36 L128 70 L160 44 L200 68 L200 240 H0 Z" fill="#D8C4A8"/>
      <path d="M0 140 C40 122, 86 154, 132 128 C164 112, 184 132, 200 124 L200 240 H0 Z" fill="#B89A78"/>
      <ellipse cx="96" cy="176" rx="78" ry="16" fill="#FFF8EC" opacity="0.7"/>
      <path d="M0 198 C80 186, 140 210, 200 192 L200 240 H0 Z" fill="#A88864"/>
      <path d="M28 164 C36 140, 54 138, 62 164" fill="#8AAB70"/>
      <path d="M44 164 v18" stroke="#6B5138" stroke-width="2"/>
    </svg>
  `,
};

export function coverArt(coverId) {
  return SCENES[coverId] || SCENES[1];
}
