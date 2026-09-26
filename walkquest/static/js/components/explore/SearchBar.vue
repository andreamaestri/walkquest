<template>
  <div class="search" :class="{ 'is-open': showPanel }" @keydown="onKeydown">
    <div class="search__bar">
      <Icon icon="material-symbols:search-rounded" class="search__lead" aria-hidden="true" />
      <input
        ref="inputRef"
        v-model="text"
        class="search__input type-body-large"
        type="search"
        role="combobox"
        autocomplete="off"
        spellcheck="false"
        :placeholder="placeholder"
        aria-label="Search walks, landmarks and places"
        :aria-expanded="String(showPanel)"
        aria-controls="search-suggestions"
        :aria-activedescendant="activeIndex >= 0 ? `search-option-${activeIndex}` : undefined"
        @focus="focused = true"
        @blur="onBlur"
      />
      <M3IconButton
        v-if="text"
        icon="material-symbols:close-rounded"
        label="Clear search"
        size="sm"
        @click="clear"
      />
      <slot name="trailing" />
    </div>

    <Transition name="search-panel">
      <div v-if="showPanel" id="search-suggestions" class="search__panel" role="listbox">
        <button
          v-for="(option, i) in options"
          :id="`search-option-${i}`"
          :key="option.key"
          type="button"
          role="option"
          class="search__option state-layer"
          :class="{ 'is-active': i === activeIndex }"
          :aria-selected="String(i === activeIndex)"
          @mousedown.prevent
          @click="choose(option)"
        >
          <span class="search__option-icon"><Icon :icon="option.icon" aria-hidden="true" /></span>
          <span class="search__option-text">
            <span class="type-body-large">{{ option.title }}</span>
            <span v-if="option.detail" class="type-body-small search__option-detail">{{ option.detail }}</span>
          </span>
        </button>
        <p v-if="!options.length" class="search__none type-body-medium">No matching walks or places</p>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, ref, watch, onBeforeUnmount } from 'vue';
import { Icon } from '@iconify/vue';
import M3IconButton from '../m3/M3IconButton.vue';
import { useSearchStore } from '../../stores/searchStore';
import { searchPlaces } from '../../services/geocode';

const props = defineProps({
  mapboxToken: { type: String, default: '' },
  placeholder: { type: String, default: 'Search walks, landmarks or places' },
});
const emit = defineEmits(['walk-selected', 'place-selected', 'locate']);

const search = useSearchStore();
const inputRef = ref(null);
const text = ref(search.query);
const focused = ref(false);
const places = ref([]);
const activeIndex = ref(-1);
let debounceTimer = null;
let controller = null;

// Live filtering of the list/map, debounced lightly for smooth typing.
watch(text, (value) => {
  clearTimeout(debounceTimer);
  activeIndex.value = -1;
  debounceTimer = setTimeout(async () => {
    search.setQuery(value);
    controller?.abort();
    controller = new AbortController();
    try {
      places.value = await searchPlaces(value, props.mapboxToken, { signal: controller.signal });
    } catch {
      places.value = [];
    }
  }, 150);
});
watch(() => search.query, (value) => { if (value !== text.value) text.value = value; });

const walkMatches = computed(() => (text.value.trim().length >= 2 ? search.results.slice(0, 4) : []));

const options = computed(() => {
  const list = [];
  if (!text.value.trim()) {
    list.push({ key: 'locate', type: 'locate', icon: 'material-symbols:my-location-rounded', title: 'Walks near me', detail: 'Use your current location' });
    return list;
  }
  for (const walk of walkMatches.value) {
    list.push({ key: `w-${walk.id}`, type: 'walk', walk, icon: 'material-symbols:hiking-rounded', title: walk.walk_name, detail: `${walk.distance?.toFixed(1)} mi · ${walk.difficulty?.short}` });
  }
  for (const place of places.value) {
    list.push({ key: `p-${place.id}`, type: 'place', place, icon: 'material-symbols:location-on-outline-rounded', title: place.name, detail: `Walks near ${place.detail || place.name}` });
  }
  return list;
});

const showPanel = computed(() => focused.value && (options.value.length > 0 || text.value.trim().length >= 3));

function choose(option) {
  if (option.type === 'walk') emit('walk-selected', option.walk);
  else if (option.type === 'place') {
    emit('place-selected', option.place);
    text.value = '';
  } else if (option.type === 'locate') emit('locate');
  focused.value = false;
  inputRef.value?.blur();
}

function onKeydown(event) {
  if (!showPanel.value) return;
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    activeIndex.value = (activeIndex.value + 1) % options.value.length;
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    activeIndex.value = (activeIndex.value - 1 + options.value.length) % options.value.length;
  } else if (event.key === 'Enter' && activeIndex.value >= 0) {
    event.preventDefault();
    choose(options.value[activeIndex.value]);
  } else if (event.key === 'Escape') {
    focused.value = false;
    inputRef.value?.blur();
  }
}

function onBlur() {
  setTimeout(() => { focused.value = false; }, 120);
}

function clear() {
  text.value = '';
  search.setQuery('');
  inputRef.value?.focus();
}

onBeforeUnmount(() => {
  clearTimeout(debounceTimer);
  controller?.abort();
});

defineExpose({ focus: () => inputRef.value?.focus() });
</script>

<style scoped>
.search { position: relative; }
.search__bar {
  display: flex;
  align-items: center;
  gap: 4px;
  block-size: 56px;
  padding-inline: 16px 4px;
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
  transition: border-radius var(--md-sys-motion-spring-fast-spatial-duration) var(--md-sys-motion-spring-fast-spatial),
    box-shadow var(--md-sys-motion-spring-default-effects-duration) var(--md-sys-motion-spring-default-effects);
}
.search.is-open .search__bar { border-radius: var(--md-sys-shape-corner-extra-large) var(--md-sys-shape-corner-extra-large) 0 0; }
.search__lead { flex: none; font-size: 24px; color: var(--md-sys-color-on-surface-variant); margin-inline-end: 8px; }
.search__input {
  flex: 1;
  min-inline-size: 0;
  block-size: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: inherit;
  font-family: inherit;
}
.search__input::placeholder { color: var(--md-sys-color-on-surface-variant); }
.search__input::-webkit-search-cancel-button { display: none; }
.search:focus-within .search__bar { box-shadow: var(--md-sys-elevation-1); }
.search__panel {
  position: absolute;
  inset-inline: 0;
  top: 100%;
  z-index: 40;
  max-block-size: min(60vh, 420px);
  overflow-y: auto;
  padding-block: 8px;
  border-radius: 0 0 var(--md-sys-shape-corner-extra-large) var(--md-sys-shape-corner-extra-large);
  background: var(--md-sys-color-surface-container-high);
  box-shadow: var(--md-sys-elevation-3);
  border-top: 1px solid var(--md-sys-color-outline-variant);
}
.search__option {
  display: flex;
  align-items: center;
  gap: 16px;
  inline-size: 100%;
  min-block-size: 56px;
  padding: 8px 16px;
  border: 0;
  background: transparent;
  color: var(--md-sys-color-on-surface);
  text-align: start;
  font: inherit;
  cursor: pointer;
}
.search__option.is-active { background: color-mix(in srgb, var(--md-sys-color-on-surface) 8%, transparent); }
.search__option-icon {
  display: grid;
  place-items: center;
  flex: none;
  inline-size: 40px;
  block-size: 40px;
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
  font-size: 20px;
}
.search__option-text { display: flex; flex-direction: column; min-inline-size: 0; }
.search__option-text > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.search__option-detail { color: var(--md-sys-color-on-surface-variant); }
.search__none { margin: 0; padding: 16px; color: var(--md-sys-color-on-surface-variant); }
.search-panel-enter-active, .search-panel-leave-active {
  transition: opacity var(--md-sys-motion-spring-fast-effects-duration) var(--md-sys-motion-spring-fast-effects),
    transform var(--md-sys-motion-spring-fast-spatial-duration) var(--md-sys-motion-spring-fast-spatial);
  transform-origin: top;
}
.search-panel-enter-from, .search-panel-leave-to { opacity: 0; transform: scaleY(0.92); }
</style>
