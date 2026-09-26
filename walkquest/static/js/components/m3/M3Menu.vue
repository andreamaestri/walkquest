<template>
  <div class="m3-menu-anchor" @keydown.esc="open = false">
    <slot name="trigger" :open="open" :toggle="toggle" />
    <Transition name="m3-menu">
      <ul v-if="open" class="m3-menu" :class="`align-${align}`" role="menu">
        <li v-for="item in items" :key="item.value" role="none">
          <button
            type="button"
            role="menuitemradio"
            class="m3-menu__item state-layer"
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
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { Icon } from '@iconify/vue';

defineProps({
  items: { type: Array, required: true },
  modelValue: { type: [String, Number], default: null },
  align: { type: String, default: 'end' },
});
const emit = defineEmits(['update:modelValue']);
const open = ref(false);
const toggle = () => { open.value = !open.value; };
function pick(value) {
  emit('update:modelValue', value);
  open.value = false;
}
function onDocumentClick(event) {
  if (!event.target.closest?.('.m3-menu-anchor')) open.value = false;
}
onMounted(() => document.addEventListener('click', onDocumentClick, true));
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick, true));
</script>

<style scoped>
.m3-menu-anchor { position: relative; display: inline-flex; }
.m3-menu {
  position: absolute;
  top: calc(100% + 4px);
  z-index: 50;
  min-inline-size: 200px;
  margin: 0;
  padding: 4px;
  list-style: none;
  border-radius: var(--md-sys-shape-corner-large);
  background: var(--md-sys-color-surface-container);
  box-shadow: var(--md-sys-elevation-2);
}
.align-end { inset-inline-end: 0; }
.align-start { inset-inline-start: 0; }
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
.m3-menu__item[aria-checked='true'] { background: var(--md-sys-color-tertiary-container); color: var(--md-sys-color-on-tertiary-container); }
.m3-menu__item svg { font-size: 20px; }
.m3-menu__check { margin-inline-start: auto; }
.m3-menu-enter-active, .m3-menu-leave-active {
  transition: opacity var(--md-sys-motion-spring-fast-effects-duration) var(--md-sys-motion-spring-fast-effects),
    transform var(--md-sys-motion-spring-fast-spatial-duration) var(--md-sys-motion-spring-fast-spatial);
  transform-origin: top right;
}
.m3-menu-enter-from, .m3-menu-leave-to { opacity: 0; transform: scale(0.9); }
</style>
