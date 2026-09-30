import { clearAuth, getStoredUser } from './auth-client.js';
import { resolveAvatarUrl } from './profile-client.js?v=1';

let currentMenu = null;

function closeUserMenu() {
  if (!currentMenu) return;
  currentMenu.remove();
  document.removeEventListener('mousedown', onOutside, true);
  document.removeEventListener('keydown', onKey, true);
  currentMenu = null;
}

function onOutside(event) {
  if (currentMenu && !currentMenu.contains(event.target) && !event.target.closest('#appAuthButton,.hud-avatar')) closeUserMenu();
}

function onKey(event) {
  if (event.key === 'Escape') closeUserMenu();
}

function avatarMarkup(user, size = 40) {
  const url = resolveAvatarUrl(user?.avatarUrl);
  const name = user?.displayName || user?.display_name || user?.username || '旅';
  return url
    ? `<img class="user-menu__avatar" style="width:${size}px;height:${size}px" src="${url}" alt="${name} 的头像">`
    : `<span class="user-menu__avatar user-menu__avatar--fallback" style="width:${size}px;height:${size}px">${name.slice(0, 2)}</span>`;
}

/**
 * Lightweight popover anchored to the top-right avatar button.
 * Deep-navy paper card with brass accents, matching the top HUD.
 */
export function openUserMenu(anchor, { onProfile, onSettings, onLogout } = {}) {
  if (currentMenu) { closeUserMenu(); return; }
  const user = getStoredUser();
  if (!user) return false;
  const name = user.displayName || user.display_name || user.username || '旅人';
  const signature = user.signature ? `<p class="user-menu__signature">${user.signature}</p>` : '';
  const menu = document.createElement('div');
  menu.className = 'user-menu';
  menu.setAttribute('role', 'menu');
  menu.innerHTML = `
    <div class="user-menu__identity">${avatarMarkup(user, 44)}
      <div><b>${name}</b><small>@${user.username}</small>${signature}</div>
    </div>
    <span class="user-menu__rule" aria-hidden="true"></span>
    <button type="button" role="menuitem" data-menu="profile">旅者档案</button>
    <button type="button" role="menuitem" data-menu="settings">圣所设置</button>
    <span class="user-menu__rule" aria-hidden="true"></span>
    <button type="button" role="menuitem" data-menu="logout" class="user-menu__logout">退出登录</button>`;
  document.body.append(menu);
  const rect = anchor.getBoundingClientRect();
  const width = 240;
  const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12));
  menu.style.left = `${left}px`;
  menu.style.top = `${rect.bottom + 10}px`;
  currentMenu = menu;
  menu.querySelectorAll('[data-menu]').forEach(button => button.addEventListener('click', () => {
    const kind = button.dataset.menu;
    closeUserMenu();
    if (kind === 'profile') onProfile?.();
    else if (kind === 'settings') onSettings?.();
    else if (kind === 'logout') {
      clearAuth();
      onLogout?.();
    }
  }));
  setTimeout(() => {
    document.addEventListener('mousedown', onOutside, true);
    document.addEventListener('keydown', onKey, true);
  }, 0);
  return true;
}

export { closeUserMenu, avatarMarkup };
