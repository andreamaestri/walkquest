<template>
  <div ref="root" class="m3-fab-menu" :class="{ 'is-open': open }" @keydown.esc="close">
    <ul :id="menuId" class="m3-fab-menu__items" role="menu" :aria-hidden="!open">
      <li
        v-for="(item, index) in items"
        :key="item.id"
        role="none"
        :style="{ '--_delay': `${(open ? items.length - 1 - index : index) * 35}ms` }"
      >
        <button
          type="button"
          role="menuitem"
          class="m3-fab-menu__item state-layer"
          :tabindex="open ? 0 : -1"
          @click="select(item)"
        >
          <Icon :icon="item.icon" aria-hidden="true" />
          <span>{{ item.label }}</span>
        </button>
      </li>
    </ul>
    <button
      type="button"
      class="m3-fab-menu__fab state-layer"
      :aria-label="open ? 'Close menu' : label"
      :aria-expanded="String(open)"
      :aria-controls="menuId"
      @click="toggle"
    >
      <!-- Both icons stay mounted so they can cross-rotate instead of popping. -->
      <Icon :icon="icon" class="m3-fab-menu__fab-icon is-closed" aria-hidden="true" />
      <Icon icon="material-symbols:close-rounded" class="m3-fab-menu__fab-icon is-open" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup>
import { onBeforeUnmount, ref, useId, watch } from 'vue';
import { Icon } from '@iconify/vue';

defineProps({
  items: { type: Array, required: true },
  icon: { type: String, default: 'material-symbols:add-rounded' },
  label: { type: String, default: 'Open menu' },
});
const emit = defineEmits(['select', 'toggle']);
const open = ref(false);
const root = ref(null);
const menuId = `fab-menu-${useId()}`;

function close() {
  open.value = false;
}
function toggle() {
  open.value = !open.value;
}
function select(item) {
  open.value = false;
  emit('select', item.id);
}

// Tapping anywhere else (the map, the sheet) closes the menu, like a scrim would.
function onPointerDownOutside(event) {
  if (root.value && !root.value.contains(event.target)) close();
}
function onKeydown(event) {
  if (event.key === 'Escape') close();
}
watch(open, (isOpen) => {
  emit('toggle', isOpen);
  const method = isOpen ? 'addEventListener' : 'removeEventListener';
  document[method]('pointerdown', onPointerDownOutside, true);
  document[method]('keydown', onKeydown);
});
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDownOutside, true);
  document.removeEventListener('keydown', onKeydown);
});

defineExpose({ close });
</script>

<style scoped>
.m3-fab-menu {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  pointer-events: none;
  -webkit-tap-highlight-color: transparent;
}
.m3-fab-menu__items {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}
/* Items spring up out of the FAB: from its corner, slightly below and smaller. */
.m3-fab-menu__items li {
  opacity: 0;
  visibility: hidden;
  transform: translate3d(0, 16px, 0) scale(0.6);
  transform-origin: bottom right;
  transition:
    opacity var(--md-sys-motion-spring-fast-effects-duration) var(--md-sys-motion-spring-fast-effects) var(--_delay),
    transform var(--md-sys-motion-spring-fast-spatial-duration) var(--md-sys-motion-spring-fast-spatial) var(--_delay),
    visibility 0s linear calc(var(--_delay) + var(--md-sys-motion-spring-fast-spatial-duration));
}
.is-open .m3-fab-menu__items li {
  opacity: 1;
  visibility: visible;
  transform: none;
  pointer-events: auto;
  transition-delay: var(--_delay), var(--_delay), 0s;
}
.m3-fab-menu__item {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  block-size: 56px;
  padding-inline: 20px 24px;
  border: 0;
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  font: inherit;
  font-size: var(--md-sys-typescale-title-medium-size);
  font-weight: 600;
  box-shadow: var(--md-sys-elevation-3);
  cursor: pointer;
  touch-action: manipulation;
  transition: border-radius var(--md-sys-motion-spring-fast-spatial-duration) var(--md-sys-motion-spring-fast-spatial);
}
.m3-fab-menu__item :deep(svg) { font-size: 24px; }
.m3-fab-menu__item:active { border-radius: var(--md-sys-shape-corner-large); }
.m3-fab-menu__fab {
  position: relative;
  display: grid;
  place-items: center;
  inline-size: 56px;
  block-size: 56px;
  border: 0;
  border-radius: var(--md-sys-shape-corner-large);
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  box-shadow: var(--md-sys-elevation-3);
  pointer-events: auto;
  cursor: pointer;
  touch-action: manipulation;
  transition:
    border-radius var(--md-sys-motion-spring-fast-spatial-duration) var(--md-sys-motion-spring-fast-spatial),
    background-color var(--md-sys-motion-spring-default-effects-duration) var(--md-sys-motion-spring-default-effects),
    color var(--md-sys-motion-spring-default-effects-duration) var(--md-sys-motion-spring-default-effects);
}
.m3-fab-menu__fab-icon {
  grid-area: 1 / 1;
  font-size: 24px;
  transition:
    transform var(--md-sys-motion-spring-fast-spatial-duration) var(--md-sys-motion-spring-fast-spatial),
    opacity var(--md-sys-motion-spring-fast-effects-duration) var(--md-sys-motion-spring-fast-effects);
}
.m3-fab-menu__fab-icon.is-open { opacity: 0; transform: rotate(-90deg) scale(0.6); }
/* Expressive: the FAB morphs into a round, primary close button. */
.is-open .m3-fab-menu__fab {
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}
.is-open .m3-fab-menu__fab-icon.is-closed { opacity: 0; transform: rotate(90deg) scale(0.6); }
.is-open .m3-fab-menu__fab-icon.is-open { opacity: 1; transform: none; }
.m3-fab-menu__fab:active { border-radius: var(--md-sys-shape-corner-medium); }
</style>
