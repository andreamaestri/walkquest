<template>
  <div class="m3-fab-menu" :class="{ 'is-open': open }" @keydown.esc="close">
    <ul :id="menuId" class="m3-fab-menu__items" role="menu" :aria-hidden="!open">
      <li
        v-for="(item, index) in items"
        :key="item.id"
        role="none"
        :style="{ '--_delay': `${(open ? items.length - 1 - index : index) * 30}ms` }"
      >
        <button
          type="button"
          role="menuitem"
          class="m3-fab-menu__item state-layer shape-morph"
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
      class="m3-fab-menu__fab state-layer shape-morph"
      :aria-label="open ? 'Close menu' : label"
      :aria-expanded="String(open)"
      :aria-controls="menuId"
      @click="open = !open"
    >
      <Icon :icon="open ? 'material-symbols:close-rounded' : icon" class="m3-fab-menu__fab-icon" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup>
import { ref, useId } from 'vue';
import { Icon } from '@iconify/vue';

defineProps({
  items: { type: Array, required: true },
  icon: { type: String, default: 'material-symbols:add-rounded' },
  label: { type: String, default: 'Open menu' },
});
const emit = defineEmits(['select']);
const open = ref(false);
const menuId = `fab-menu-${useId()}`;

function close() {
  open.value = false;
}
function select(item) {
  open.value = false;
  emit('select', item.id);
}
defineExpose({ close });
</script>

<style scoped>
.m3-fab-menu {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  pointer-events: none;
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
.m3-fab-menu__items li {
  opacity: 0;
  transform: translateY(12px) scale(0.85);
  transform-origin: right center;
  transition:
    opacity var(--md-sys-motion-spring-fast-effects-duration) var(--md-sys-motion-spring-fast-effects) var(--_delay),
    transform var(--md-sys-motion-spring-fast-spatial-duration) var(--md-sys-motion-spring-fast-spatial) var(--_delay);
}
.is-open .m3-fab-menu__items li { opacity: 1; transform: none; pointer-events: auto; }
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
}
.m3-fab-menu__item :deep(svg) { font-size: 24px; }
.m3-fab-menu__item:active { border-radius: var(--md-sys-shape-corner-large); }
.m3-fab-menu__fab {
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
}
.m3-fab-menu__fab-icon { font-size: 24px; }
/* Expressive: the FAB morphs into a round, primary close button. */
.is-open .m3-fab-menu__fab {
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}
</style>
