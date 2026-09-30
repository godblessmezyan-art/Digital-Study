import { getStoredUser, updateStoredUser } from './auth-client.js';
import { getMyProfile, resolveAvatarUrl, updateMyProfile, uploadAvatar } from './profile-client.js?v=1';
import { PageContainer, PageHero, PaperSurface, SectionBlock } from './page-system.js?v=2';

const SIGNATURE_MAX = 120;
const NAME_MIN = 2;
const NAME_MAX = 30;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

function identityCard(profile, previewUrl) {
  const name = profile.displayName || profile.username;
  const avatar = previewUrl || resolveAvatarUrl(profile.avatarUrl);
  return `<div class="profile-identity">
    <button type="button" class="profile-avatar" data-avatar-trigger aria-label="更换头像">
      ${avatar
        ? `<img src="${avatar}" alt="${esc(name)} 的头像">`
        : `<span class="profile-avatar__fallback">${esc(name.slice(0, 2))}</span>`}
      <span class="profile-avatar__veil">更换头像</span>
    </button>
    <input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" data-avatar-input hidden>
    <h2 class="profile-name" data-profile-name>${esc(name)}</h2>
    <p class="profile-signature" data-profile-signature>${profile.signature ? `“${esc(profile.signature)}”` : '还没有留下签名。'}</p>
    <small class="profile-handle">@${esc(profile.username)}</small>
  </div>`;
}

function editForm(profile) {
  return `<form class="profile-form" data-profile-form novalidate>
    <label><span>用户名</span>
      <input name="displayName" maxlength="${NAME_MAX}" value="${esc(profile.displayName || '')}" placeholder="${esc(profile.username)}（留空则显示账号名）">
      <small class="profile-hint" data-name-hint>${NAME_MIN}–${NAME_MAX} 个字符，留空则显示账号名</small>
    </label>
    <label><span>个性签名 · TRAVELER'S NOTE</span>
      <textarea name="signature" rows="3" maxlength="${SIGNATURE_MAX}" placeholder="例如：在云海之上阅读，也在尘世之中生活。">${esc(profile.signature || '')}</textarea>
      <small class="profile-count" data-signature-count>0 / ${SIGNATURE_MAX}</small>
    </label>
    <footer>
      <span class="profile-save-state" data-save-state role="status" aria-live="polite"></span>
      <button type="submit" class="profile-save" data-profile-save disabled>保存修改</button>
    </footer>
  </form>`;
}

export async function createProfilePage(root, { showToast, openLogin }) {
  if (!getStoredUser()) {
    root.innerHTML = `<section class="profile-page"><div class="profile-signed-out"><small>TRAVELER PROFILE</small><h1>登录后翻开你的档案</h1><p>旅者档案记录你在埃瑟瑞恩留下的名字、形象与只言片语。</p><button type="button" data-profile-login>登录账号</button></div></section>`;
    root.querySelector('[data-profile-login]').onclick = event => { event.preventDefault(); openLogin?.(); };
    return;
  }

  root.innerHTML = '<section class="profile-page"><div class="profile-skeleton"><i></i><i></i><i></i></div></section>';
  let profile;
  try {
    profile = await getMyProfile();
  } catch (error) {
    root.innerHTML = `<section class="profile-page"><div class="profile-error"><span>档案暂时无法翻开</span><p>${esc(error.message)}</p><button type="button">重新尝试</button></div></section>`;
    root.querySelector('button').onclick = () => createProfilePage(root, { showToast, openLogin });
    return;
  }

  let pendingAvatar = null;
  let previewUrl = null;
  let saving = false;

  const paint = () => {
    root.innerHTML = `<section class="profile-page">
      ${PageContainer(`
        ${PageHero({ eyebrow: 'TRAVELER PROFILE', title: '旅者档案', description: '记录属于你的名字、形象与留下的只言片语。' })}
        ${PaperSurface(`
          <div class="profile-grid">
            ${SectionBlock(identityCard(profile, previewUrl), 'profile-identity-block')}
            ${SectionBlock(editForm(profile), 'profile-edit-block')}
          </div>
        `, 'profile-surface')}
      `, { tone: 'chronicle', className: 'profile-container' })}
    </section>`;
    bind();
    syncCount();
    syncDirty();
  };

  const form = () => root.querySelector('[data-profile-form]');
  const saveButton = () => root.querySelector('[data-profile-save]');
  const saveState = () => root.querySelector('[data-save-state]');

  const currentValues = () => {
    const el = form();
    return {
      displayName: el.elements.displayName.value.trim(),
      signature: el.elements.signature.value.trim(),
    };
  };

  const isDirty = () => {
    const values = currentValues();
    return Boolean(pendingAvatar)
      || values.displayName !== (profile.displayName || '')
      || values.signature !== (profile.signature || '');
  };

  const syncCount = () => {
    const el = form();
    if (!el) return;
    const counter = root.querySelector('[data-signature-count]');
    counter.textContent = `${el.elements.signature.value.length} / ${SIGNATURE_MAX}`;
  };

  const syncDirty = () => {
    const button = saveButton();
    if (!button) return;
    const values = currentValues();
    const nameInvalid = values.displayName.length > 0 && values.displayName.length < NAME_MIN;
    button.disabled = saving || !isDirty() || nameInvalid;
    const hint = root.querySelector('[data-name-hint]');
    if (hint) hint.textContent = nameInvalid ? `用户名至少 ${NAME_MIN} 个字符` : `${NAME_MIN}–${NAME_MAX} 个字符，留空则显示账号名`;
  };

  const bind = () => {
    const el = form();
    el.addEventListener('input', () => { syncCount(); syncDirty(); });

    root.querySelector('[data-avatar-trigger]').addEventListener('click', () => {
      root.querySelector('[data-avatar-input]').click();
    });
    root.querySelector('[data-avatar-input]').addEventListener('change', event => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      if (!ACCEPTED.includes(file.type)) { showToast('头像仅支持 jpg / jpeg / png / webp 格式'); return; }
      if (file.size > 5 * 1024 * 1024) { showToast('头像不能超过 5MB'); return; }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      pendingAvatar = file;
      previewUrl = URL.createObjectURL(file);
      const image = root.querySelector('.profile-avatar img');
      const trigger = root.querySelector('[data-avatar-trigger]');
      if (image) image.src = previewUrl;
      else {
        trigger.innerHTML = `<img src="${previewUrl}" alt="待保存的头像"><span class="profile-avatar__veil">更换头像</span>`;
      }
      saveState().textContent = '形象待保存';
      syncDirty();
    });

    el.addEventListener('submit', async event => {
      event.preventDefault();
      if (saving || !isDirty()) return;
      const values = currentValues();
      if (values.displayName && (values.displayName.length < NAME_MIN || values.displayName.length > NAME_MAX)) {
        showToast(`用户名需为 ${NAME_MIN}–${NAME_MAX} 个字符`);
        return;
      }
      saving = true;
      const button = saveButton();
      button.disabled = true;
      try {
        if (pendingAvatar) {
          button.textContent = '正在铭录形象……';
          const uploaded = await uploadAvatar(pendingAvatar);
          profile = { ...profile, avatarUrl: uploaded.avatarUrl, avatarVersion: uploaded.avatarVersion };
          pendingAvatar = null;
          if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
        }
        button.textContent = '保存中…';
        const saved = await updateMyProfile(values);
        profile = { ...profile, ...saved };
        updateStoredUser({
          displayName: saved.displayName,
          signature: saved.signature,
          avatarUrl: saved.avatarUrl,
        });
        saveState().textContent = '';
        showToast('档案已更新');
        paint();
      } catch (error) {
        saving = false;
        button.textContent = '保存修改';
        button.disabled = false;
        saveState().textContent = '保存失败';
        showToast(error.message || '档案保存失败');
      }
    });
  };

  paint();
}
