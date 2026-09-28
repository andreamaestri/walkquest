<template>
  <div ref="anchorRef" class="m3-menu-anchor" @keydown="onKeydown" @focusout="onFocusout">
    <slot name="trigger" :open="open" :toggle="toggle" />
    <Transition name="m3-menu">
      <!-- Rendered in the top layer (popover) so scrolling or clipped ancestors,
           like the filter chip row, can't cut it off. -->
      <ul
        v-if="open"
        ref="menuRef"
        popover="manual"
        class="m3-menu"
        :class="[`align-${align}`, { 'is-above': above }]"
        :style="position"
        role="menu"
      >
        <li v-for="item in items" :key="item.value" role="none">
          <button
            type="button"
            role="menuitemradio"
            class="m3-menu__item state-layer"
            tabindex="-1"
            :aria-checked="String(item.value === modelValue)"
            @click="pick(item.value)"
          >
            <Icon v-if="item.icon" :icon="item.icon" aria-hidden="true" />
            <span>{{ item.label }}</span>
            <Icon v-if="item.value === modelValue" icon="material-symbols:check-rounded" class="m3-menu__check" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </Transition>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';

const props = defineProps({
  items: { type: Array, required: true },
  modelValue: { type: [String, Number], default: null },
  align: { type: String, default: 'end' },
});
const emit = defineEmits(['update:modelValue']);
const open = ref(false);
const anchorRef = ref(null);
const menuRef = ref(null);
const position = ref({});
const above = ref(false);

const toggle = () => { open.value = !open.value; };
const trigger = () => anchorRef.value?.querySelector(':scope > :not(.m3-menu)');
const menuItems = () => [...(menuRef.value?.querySelectorAll('[role="menuitemradio"]') || [])];

function close({ restoreFocus = false } = {}) {
  if (!open.value) return;
  open.value = false;
  if (restoreFocus) trigger()?.focus();
}
function pick(value) {
  emit('update:modelValue', value);
  close({ restoreFocus: true });
}

/** Sit under the trigger (or above it if there's no room), kept inside the viewport. */
function place() {
  const menu = menuRef.value;
  const rect = trigger()?.getBoundingClientRect();
  if (!menu || !rect) return;
  const gap = 4;
  const margin = 8;
  const { offsetWidth: w, offsetHeight: h } = menu;
  above.value = rect.bottom + gap + h > innerHeight - margin && rect.top - gap - h >= margin;
  const top = above.value ? rect.top - gap - h : rect.bottom + gap;
  const left = props.align === 'start' ? rect.left : rect.right - w;
  position.value = {
    top: `${Math.round(top)}px`,
    left: `${Math.round(Math.min(Math.max(left, margin), innerWidth - w - margin))}px`,
  };
}

watch(open, async (isOpen) => {
  if (!isOpen) return;
  await nextTick();
  const menu = menuRef.value;
  if (!menu) return;
  menu.showPopover?.();
  place();
  // Menu-button pattern: focus moves into the menu, on the checked item.
  const items = menuItems();
  (items.find((item) => item.getAttribute('aria-checked') === 'true') || items[0])?.focus({ preventScroll: true });
});

function onKeydown(event) {
  const inMenu = menuRef.value?.contains(event.target);
  if (!inMenu) {
    // On the trigger: ArrowDown/ArrowUp open the menu too.
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && !open.value) {
      event.preventDefault();
      open.value = true;
    } else if (event.key === 'Escape' && open.value) {
      close();
    }
    return;
  }
  const items = menuItems();
  const index = items.indexOf(document.activeElement);
  const next = {
    ArrowDown: (index + 1) % items.length,
    ArrowUp: (index - 1 + items.length) % items.length,
    Home: 0,
    End: items.length - 1,
  }[event.key];
  if (next !== undefined) {
    event.preventDefault();
    items[next].focus();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    close({ restoreFocus: true });
  } else if (event.key === 'Tab') {
    close();
  }
}
function onFocusout(event) {
  if (open.value && event.relatedTarget && !anchorRef.value?.contains(event.relatedTarget)) close();
}
function onDocumentClick(event) {
  if (!anchorRef.value?.contains(event.target)) close();
}
function onViewportChange() {
  if (open.value) place();
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick, true);
  // Capture: follow the trigger when any ancestor (chip row, pane) scrolls.
  document.addEventListener('scroll', onViewportChange, true);
  window.addEventListener('resize', onViewportChange);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick, true);
  document.removeEventListener('scroll', onViewportChange, true);
  window.removeEventListener('resize', onViewportChange);
});
</script>

<style scoped>
.m3-menu-anchor { position: relative; display: inline-flex; }
.m3-menu {
  /* Reset the UA popover box; place() sets top/left in viewport coordinates. */
  position: fixed;
  inset: auto;
  z-index: 50;
  min-inline-size: 200px;
  margin: 0;
  padding: 4px;
  border: 0;
  overflow: visible;
  list-style: none;
  border-radius: var(--md-sys-shape-corner-large);
  background: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface);
  box-shadow: var(--md-sys-elevation-2);
}
.m3-menu__item {
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
  text-align: start;
  cursor: pointer;
}
.m3-menu__item:focus-visible { outline: 2px solid var(--md-sys-color-secondary); outline-offset: -2px; }
.m3-menu__item[aria-checked='true'] { background: var(--md-sys-color-tertiary-container); color: var(--md-sys-color-on-tertiary-container); }
.m3-menu__item svg { font-size: 20px; }
.m3-menu__check { margin-inline-start: auto; }
.m3-menu-enter-active, .m3-menu-leave-active {
  transition: opacity var(--md-sys-motion-spring-fast-effects-duration) var(--md-sys-motion-spring-fast-effects),
    transform var(--md-sys-motion-spring-fast-spatial-duration) var(--md-sys-motion-spring-fast-spatial);
}
/* Grow out of the trigger's corner. */
.align-end { transform-origin: top right; }
.align-start { transform-origin: top left; }
.align-end.is-above { transform-origin: bottom right; }
.align-start.is-above { transform-origin: bottom left; }
.m3-menu-enter-from, .m3-menu-leave-to { opacity: 0; transform: scale(0.9); }
@media (prefers-reduced-motion: reduce) {
  .m3-menu-enter-from, .m3-menu-leave-to { transform: none; }
}
@media (forced-colors: active) {
  .m3-menu { border: 1px solid CanvasText; }
}
</style>
