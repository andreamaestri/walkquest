<template>
  <button
    ref="buttonRef"
    type="button"
    class="account-button state-layer"
    :class="{ 'is-open': open }"
    :aria-label="isAuthenticated ? `Account menu for ${displayName}` : 'Account menu'"
    aria-haspopup="menu"
    :aria-expanded="String(open)"
    :aria-controls="menuId"
    @click="toggle"
  >
    <span v-if="isAuthenticated" class="account-avatar" :style="{ '--_hue': avatarHue }" aria-hidden="true">
      {{ initials }}
    </span>
    <Icon v-else icon="material-symbols:account-circle" class="account-button__icon" aria-hidden="true" />
  </button>

  <Teleport to="body">
    <Transition name="account-menu" @after-leave="onAfterLeave">
      <div
        v-if="open"
        :id="menuId"
        ref="menuRef"
        class="account-menu"
        :class="`from-${placement.origin}`"
        :style="{ top: `${placement.top}px`, left: `${placement.left}px`, visibility: placed ? 'visible' : 'hidden' }"
        role="menu"
        :aria-label="isAuthenticated ? 'Account' : 'Sign in'"
        @keydown="onMenuKeydown"
      >
        <template v-if="isAuthenticated">
          <div class="account-menu__header" role="none">
            <span class="account-avatar account-avatar--large" :style="{ '--_hue': avatarHue }" aria-hidden="true">{{ initials }}</span>
            <div class="account-menu__who">
              <span class="type-title-medium account-menu__name">{{ displayName }}</span>
              <span v-if="email && email !== displayName" class="type-body-medium account-menu__email">{{ email }}</span>
            </div>
          </div>
          <div class="account-menu__divider" role="separator" />
          <component
            :is="item.href ? 'a' : 'button'"
            v-for="(item, index) in items"
            :key="item.id"
            :type="item.href ? undefined : 'button'"
            :href="item.href"
            class="account-menu__item state-layer"
            :class="{ 'is-danger': item.danger }"
            :style="{ '--_i': index }"
            role="menuitem"
            tabindex="-1"
            @click="onItem(item)"
          >
            <Icon :icon="item.icon" aria-hidden="true" />
            <span>{{ item.label }}</span>
          </component>
        </template>

        <template v-else>
          <div class="account-menu__intro" role="none">
            <span class="account-menu__badge" aria-hidden="true"><Icon icon="material-symbols:hiking-rounded" /></span>
            <p class="type-title-medium account-menu__name">Walk further with an account</p>
            <p class="type-body-medium account-menu__email">Save walks, log adventures and pick up where you left off.</p>
          </div>
          <div class="account-menu__actions">
            <RouterLink to="/login" class="account-menu__cta is-filled state-layer" role="menuitem" tabindex="-1" style="--_i: 0" @click="close()">
              <Icon icon="material-symbols:login-rounded" aria-hidden="true" />Sign in
            </RouterLink>
            <RouterLink to="/signup" class="account-menu__cta is-tonal state-layer" role="menuitem" tabindex="-1" style="--_i: 1" @click="close()">
              <Icon icon="material-symbols:person-add-rounded" aria-hidden="true" />Create account
            </RouterLink>
          </div>
        </template>
      </div>
    </Transition>

    <ConfirmationModal
      v-if="confirmSignOut"
      title="Sign out?"
      message="You'll need to sign in again to see your saved walks and adventures."
      confirm-text="Sign out"
      cancel-text="Cancel"
      :is-submitting="signingOut"
      @confirm="signOut"
      @cancel="confirmSignOut = false"
    />
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, useId, watch } from 'vue';
import { Icon } from '@iconify/vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { useToastStore } from '../../stores/toast';
import ConfirmationModal from './ConfirmationModal.vue';

const authStore = useAuthStore();
const toast = useToastStore();
const router = useRouter();
const route = useRoute();

const menuId = `account-menu-${useId()}`;
const buttonRef = ref(null);
const menuRef = ref(null);
const open = ref(false);
const placed = ref(false);
const placement = reactive({ top: 0, left: 0, origin: 'top-right' });
const confirmSignOut = ref(false);
const signingOut = ref(false);
let returnFocus = false;

const isAuthenticated = computed(() => authStore.isAuthenticated);
const email = computed(() => authStore.user?.email || '');
const displayName = computed(() => {
  const user = authStore.user || {};
  const full = [user.first_name, user.last_name].filter(Boolean).join(' ');
  return full || user.username || email.value.split('@')[0] || 'Your account';
});
const initials = computed(() => (authStore.userDataLoaded && authStore.userInitials) || displayName.value.slice(0, 1).toUpperCase() || '·');
/** Stable per-user hue; the avatar's lightness/chroma come from the theme so contrast holds in both modes. */
const avatarHue = computed(() => {
  const id = email.value || authStore.user?.username || '';
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (id.charCodeAt(i) + ((hash << 5) - hash)) | 0;
  return Math.abs(hash) % 360;
});

const allauth = () => window.djangoAllAuth || {};
const items = computed(() => [
  { id: 'profile', label: 'Profile settings', icon: 'material-symbols:manage-accounts-outline-rounded', to: '/profile' },
  { id: 'adventures', label: 'My adventures', icon: 'material-symbols:auto-stories-outline-rounded', to: '/adventures' },
  { id: 'email', label: 'Email addresses', icon: 'material-symbols:mail-outline-rounded', href: allauth().emailUrl || '/accounts/email/' },
  { id: 'password', label: 'Change password', icon: 'material-symbols:key-outline-rounded', href: allauth().passwordChangeUrl || '/accounts/password/change/' },
  { id: 'signout', label: 'Sign out', icon: 'material-symbols:logout-rounded', danger: true },
]);

// ── Placement ────────────────────────────────────────────────────────────
// Next to the button when it sits on the left edge (desktop rail), otherwise
// below it (or above, when there's no room). Always kept inside the viewport.
const GAP = 8;
const EDGE = 8;
function place() {
  const button = buttonRef.value;
  const menu = menuRef.value;
  if (!button || !menu) return;
  const b = button.getBoundingClientRect();
  const w = menu.offsetWidth;
  const h = menu.offsetHeight;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));
  let top;
  let left;
  let vertical;
  let horizontal;
  if (b.left < vw * 0.2 && b.right + GAP + w <= vw - EDGE) {
    // Beside the button, grow towards the free vertical space.
    left = b.right + GAP;
    horizontal = 'left';
    const below = vh - b.top;
    if (below >= h + EDGE) { top = b.top; vertical = 'top'; } else { top = b.bottom - h; vertical = 'bottom'; }
  } else {
    horizontal = b.left + b.width / 2 > vw / 2 ? 'right' : 'left';
    left = horizontal === 'right' ? b.right - w : b.left;
    if (vh - b.bottom >= h + GAP + EDGE || b.top < h + GAP + EDGE) { top = b.bottom + GAP; vertical = 'top'; } else { top = b.top - GAP - h; vertical = 'bottom'; }
  }
  placement.left = clamp(left, EDGE, vw - w - EDGE);
  placement.top = clamp(top, EDGE, vh - h - EDGE);
  placement.origin = `${vertical}-${horizontal}`;
  placed.value = true;
}

// ── Open / close ─────────────────────────────────────────────────────────
async function show() {
  placed.value = false;
  open.value = true;
  if (isAuthenticated.value && !authStore.userDataLoaded && !authStore.isLoading) authStore.checkAuth();
  await nextTick();
  place();
  focusItem(0);
}
function close({ focus = false } = {}) {
  if (!open.value) return;
  returnFocus = focus;
  open.value = false;
}
function toggle() {
  if (open.value) close();
  else show();
}
function onAfterLeave() {
  if (returnFocus) buttonRef.value?.focus();
  returnFocus = false;
}

function menuItems() {
  return [...(menuRef.value?.querySelectorAll('[role="menuitem"]') || [])];
}
function focusItem(index) {
  const list = menuItems();
  if (!list.length) return;
  list[(index + list.length) % list.length].focus({ preventScroll: true });
}
function onMenuKeydown(event) {
  const list = menuItems();
  const current = list.indexOf(document.activeElement);
  if (event.key === 'ArrowDown') { event.preventDefault(); focusItem(current + 1); }
  else if (event.key === 'ArrowUp') { event.preventDefault(); focusItem(current - 1); }
  else if (event.key === 'Home') { event.preventDefault(); focusItem(0); }
  else if (event.key === 'End') { event.preventDefault(); focusItem(-1); }
  else if (event.key === 'Escape') { event.preventDefault(); close({ focus: true }); }
  else if (event.key === 'Tab') close();
}

function onItem(item) {
  if (item.id === 'signout') {
    close();
    confirmSignOut.value = true;
    return;
  }
  close();
  if (item.to) router.push(item.to);
}

async function signOut() {
  signingOut.value = true;
  try {
    await authStore.logout();
    confirmSignOut.value = false;
    toast.show('Signed out', 'info', 3000);
    router.push('/');
  } catch {
    window.location.href = '/accounts/logout/';
  } finally {
    signingOut.value = false;
  }
}

function onPointerDown(event) {
  if (!open.value) return;
  if (menuRef.value?.contains(event.target) || buttonRef.value?.contains(event.target)) return;
  close();
}
const onViewportChange = () => { if (open.value) place(); };

watch(() => route.fullPath, () => close());
watch(isAuthenticated, async () => {
  if (!open.value) return;
  await nextTick();
  place();
});
onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown, true);
  window.addEventListener('resize', onViewportChange);
});
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown, true);
  window.removeEventListener('resize', onViewportChange);
});
</script>

<style scoped>
.account-button {
  position: relative;
  display: inline-grid;
  place-items: center;
  inline-size: 48px;
  block-size: 48px;
  padding: 0;
  border: 0;
  border-radius: var(--md-sys-shape-corner-full);
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.account-button__icon { font-size: 32px; }
.account-button:focus-visible { outline: 2px solid var(--md-sys-color-secondary); outline-offset: 2px; }

/* Avatar: hue per user, tone from the theme (tonal container pair). */
.account-avatar {
  display: grid;
  place-items: center;
  inline-size: 36px;
  block-size: 36px;
  border-radius: var(--md-sys-shape-corner-full);
  background: oklch(90% 0.07 var(--_hue));
  color: oklch(30% 0.09 var(--_hue));
  font-weight: 600;
  font-size: 15px;
  line-height: 1;
  text-transform: uppercase;
  user-select: none;
  /* M3E: the avatar morphs to a rounded square while its menu is open. */
  transition: border-radius var(--md-sys-motion-spring-fast-spatial-duration) var(--md-sys-motion-spring-fast-spatial),
    scale var(--md-sys-motion-spring-fast-spatial-duration) var(--md-sys-motion-spring-fast-spatial);
}
:global([data-theme='dark']) .account-avatar {
  background: oklch(40% 0.09 var(--_hue));
  color: oklch(93% 0.05 var(--_hue));
}
.account-button:active .account-avatar { scale: 0.92; }
.is-open .account-avatar { border-radius: var(--md-sys-shape-corner-medium); }
.account-avatar--large { inline-size: 48px; block-size: 48px; font-size: 20px; flex: none; }

/* ── Menu surface ─────────────────────────────────────────────────────── */
.account-menu {
  position: fixed;
  z-index: 1200;
  inline-size: min(300px, calc(100vw - 16px));
  padding: 8px;
  border-radius: var(--md-sys-shape-corner-large);
  background: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface);
  box-shadow: var(--md-sys-elevation-2);
  font-family: var(--md-ref-typeface-plain);
}
.from-top-left { transform-origin: top left; }
.from-top-right { transform-origin: top right; }
.from-bottom-left { transform-origin: bottom left; }
.from-bottom-right { transform-origin: bottom right; }

.account-menu__header { display: flex; align-items: center; gap: 12px; padding: 8px 8px 12px; }
.account-menu__who { display: flex; flex-direction: column; min-inline-size: 0; }
.account-menu__name { margin: 0; font-weight: 600; color: var(--md-sys-color-on-surface); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.account-menu__email { margin: 0; color: var(--md-sys-color-on-surface-variant); overflow: hidden; text-overflow: ellipsis; }
.account-menu__divider { block-size: 1px; margin: 0 8px 4px; background: var(--md-sys-color-outline-variant); }

.account-menu__item {
  display: flex;
  align-items: center;
  gap: 12px;
  inline-size: 100%;
  block-size: 44px;
  padding-inline: 12px;
  border: 0;
  border-radius: var(--md-sys-shape-corner-medium);
  background: transparent;
  color: var(--md-sys-color-on-surface);
  font: inherit;
  font-size: var(--md-sys-typescale-label-large-size);
  font-weight: 500;
  text-align: start;
  text-decoration: none;
  cursor: pointer;
  transition: border-radius var(--md-sys-motion-spring-fast-spatial-duration) var(--md-sys-motion-spring-fast-spatial);
}
.account-menu__item svg { font-size: 22px; color: var(--md-sys-color-on-surface-variant); flex: none; }
.account-menu__item:focus-visible { outline: 2px solid var(--md-sys-color-secondary); outline-offset: -2px; }
.account-menu__item:active { border-radius: var(--md-sys-shape-corner-large); }
.account-menu__item.is-danger, .account-menu__item.is-danger svg { color: var(--md-sys-color-error); }

.account-menu__intro { display: flex; flex-direction: column; gap: 4px; padding: 8px 8px 16px; }
.account-menu__intro .account-menu__name { white-space: normal; }
.account-menu__badge {
  display: grid;
  place-items: center;
  inline-size: 48px;
  block-size: 48px;
  margin-block-end: 8px;
  border-radius: var(--md-sys-shape-corner-large);
  background: var(--md-sys-color-tertiary-container);
  color: var(--md-sys-color-on-tertiary-container);
  font-size: 26px;
}
.account-menu__actions { display: grid; gap: 8px; }
.account-menu__cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  block-size: 48px;
  border-radius: var(--md-sys-shape-corner-full);
  font-size: var(--md-sys-typescale-label-large-size);
  font-weight: 600;
  text-decoration: none;
  transition: border-radius var(--md-sys-motion-spring-fast-spatial-duration) var(--md-sys-motion-spring-fast-spatial);
}
.account-menu__cta svg { font-size: 20px; }
.account-menu__cta:active { border-radius: var(--md-sys-shape-corner-medium); }
.account-menu__cta:focus-visible { outline: 2px solid var(--md-sys-color-secondary); outline-offset: 2px; }
.account-menu__cta.is-filled { background: var(--md-sys-color-primary); color: var(--md-sys-color-on-primary); }
.account-menu__cta.is-tonal { background: var(--md-sys-color-secondary-container); color: var(--md-sys-color-on-secondary-container); }

/* ── M3E motion: surface springs out of the avatar's corner, items follow ── */
.account-menu-enter-active {
  transition: scale var(--md-sys-motion-spring-fast-spatial-duration) var(--md-sys-motion-spring-fast-spatial),
    opacity var(--md-sys-motion-spring-fast-effects-duration) var(--md-sys-motion-spring-fast-effects);
}
.account-menu-leave-active {
  transition: scale var(--md-sys-motion-spring-default-effects-duration) var(--md-sys-motion-spring-default-effects),
    opacity var(--md-sys-motion-spring-fast-effects-duration) var(--md-sys-motion-spring-fast-effects);
}
.account-menu-enter-from { scale: 0.8; opacity: 0; }
.account-menu-leave-to { scale: 0.92; opacity: 0; }
/* Items mount with the menu, so this plays once per open (independent of the surface transition). */
:is(.account-menu__item, .account-menu__cta, .account-menu__header, .account-menu__intro) {
  animation: account-item-in var(--md-sys-motion-spring-default-spatial-duration) var(--md-sys-motion-spring-default-spatial) both;
  animation-delay: calc(40ms + var(--_i, 0) * 25ms);
}
@keyframes account-item-in { from { opacity: 0; translate: 0 -6px; } }
</style>
