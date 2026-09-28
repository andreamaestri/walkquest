<template>
  <nav class="rail" aria-label="Main navigation">
    <M3IconButton
      class="rail__menu"
      :icon="paneOpen ? 'material-symbols:menu-open-rounded' : 'material-symbols:menu-rounded'"
      :label="paneOpen ? 'Hide walk list' : 'Show walk list'"
      @click="$emit('toggle-pane')"
    />
    <button type="button" class="rail__fab state-layer shape-morph" aria-label="WalkQuest home" @click="$emit('home')">
      <Icon icon="material-symbols:hiking-rounded" aria-hidden="true" />
    </button>

    <div class="rail__items">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="rail__item"
        :class="{ 'is-active': active === item.id }"
        :aria-current="active === item.id ? 'page' : undefined"
        @click="$emit('navigate', item.id)"
      >
        <span class="rail__indicator state-layer shape-morph">
          <Icon :icon="active === item.id ? item.activeIcon : item.icon" aria-hidden="true" />
        </span>
        <span class="rail__label type-label-medium">{{ item.label }}</span>
      </button>
    </div>

    <div class="rail__footer">
      <ThemeToggle />
      <div class="rail__account"><AccountCircle /></div>
    </div>
  </nav>
</template>

<script setup>
import { Icon } from '@iconify/vue';
import M3IconButton from '../m3/M3IconButton.vue';
import ThemeToggle from '../shared/ThemeToggle.vue';
import AccountCircle from '../shared/AccountCircle.vue';

defineProps({
  active: { type: String, default: 'explore' },
  paneOpen: { type: Boolean, default: true },
});
defineEmits(['navigate', 'home', 'toggle-pane']);

const items = [
  { id: 'explore', label: 'Explore', icon: 'material-symbols:explore-outline-rounded', activeIcon: 'material-symbols:explore-rounded' },
  { id: 'nearby', label: 'Nearby', icon: 'material-symbols:near-me-outline-rounded', activeIcon: 'material-symbols:near-me-rounded' },
  { id: 'saved', label: 'Saved', icon: 'material-symbols:bookmark-outline-rounded', activeIcon: 'material-symbols:bookmark-rounded' },
  { id: 'adventures', label: 'Adventures', icon: 'material-symbols:auto-stories-outline-rounded', activeIcon: 'material-symbols:auto-stories-rounded' },
];
</script>

<style scoped>
.rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  inline-size: 96px;
  flex: none;
  padding: 16px 0 20px;
  background: var(--md-sys-color-surface);
  z-index: 20;
}
.rail__menu { margin-bottom: 4px; }
.rail__fab {
  display: grid;
  place-items: center;
  inline-size: 56px;
  block-size: 56px;
  margin-bottom: 28px;
  border: 0;
  border-radius: var(--md-sys-shape-corner-large);
  background: var(--md-sys-color-tertiary-container);
  color: var(--md-sys-color-on-tertiary-container);
  font-size: 24px;
  cursor: pointer;
}
.rail__fab:active { border-radius: var(--md-sys-shape-corner-medium); }
.rail__items { display: flex; flex-direction: column; gap: 12px; }
.rail__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  inline-size: 80px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.rail__indicator {
  display: grid;
  place-items: center;
  inline-size: 56px;
  block-size: 32px;
  border-radius: var(--md-sys-shape-corner-full);
  font-size: 24px;
}
.rail__item:active .rail__indicator { inline-size: 48px; }
.rail__item.is-active { color: var(--md-sys-color-on-surface); }
.rail__item.is-active .rail__indicator {
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}
.rail__item.is-active .rail__label { font-weight: 700; color: var(--md-sys-color-secondary); }
.rail__footer { margin-top: auto; display: flex; flex-direction: column; align-items: center; gap: 12px; }
</style>
