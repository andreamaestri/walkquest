<template>
  <div class="shell" :class="isMobile ? 'is-mobile' : 'is-desktop'">
    <!-- ── Desktop: rail · list/detail pane · map ─────────────────────── -->
    <template v-if="!isMobile">
      <AppRail
        :active="railActive"
        :pane-open="paneOpen"
        @navigate="navigate"
        @home="goHome"
        @toggle-pane="paneOpen = !paneOpen"
      />
      <Transition name="pane">
        <aside v-show="paneOpen" class="pane" aria-label="Walks">
          <Transition name="swap" mode="out-in">
            <WalkDetail
              v-if="selectedWalk"
              :key="selectedWalk.id"
              :walk="selectedWalk"
              :detail="selectedDetail"
              :loading-detail="detailLoading"
              :favorite="walksStore.isFavorite(selectedWalk.id)"
              :pending="walksStore.isPendingFavorite(selectedWalk.id)"
              :category-names="walksStore.categoryNames"
              @close="goHome"
              @favorite="walksStore.toggleFavorite($event)"
              @directions="openDirections"
              @recenter="mapRef?.recenter()"
              @log-adventure="logAdventure"
              @category="filterByCategory"
            />
            <ExplorePane
              v-else
              ref="exploreRef"
              :selected-id="selectedId"
              @select="selectWalk"
              @hover="hoveredId = $event?.id || null"
              @nearby="navigate('nearby')"
            >
              <template #header>
                <div class="pane__header">
                  <p class="pane__eyebrow type-label-large">WalkQuest</p>
                  <h1 class="pane__title type-headline-medium">{{ paneTitle }}</h1>
                  <SearchBar
                    :mapbox-token="mapboxToken"
                    @walk-selected="selectWalk"
                    @place-selected="selectPlace"
                    @locate="navigate('nearby')"
                  />
                </div>
              </template>
            </ExplorePane>
          </Transition>
        </aside>
      </Transition>
    </template>

    <!-- ── Map (shared) ───────────────────────────────────────────────── -->
    <main class="map-area">
      <WalkMap
        ref="mapRef"
        :token="mapboxToken"
        :walks="walksStore.walks"
        :match-ids="search.isFiltered ? search.matchIds : null"
        :favorite-ids="walksStore.favoriteIds"
        :selected-id="selectedId"
        :hovered-id="hoveredId"
        :padding="mapPadding"
        @select="selectWalk"
        @hover="walksStore.prefetchDetail($event)"
        @located="onLocated"
      />
    </main>

    <!-- ── Mobile: floating search + bottom sheet ─────────────────────── -->
    <template v-if="isMobile">
      <div v-show="!selectedWalk || sheetSnap < 2" class="mobile-top">
        <SearchBar
          :mapbox-token="mapboxToken"
          placeholder="Search walks or places"
          @walk-selected="selectWalk"
          @place-selected="selectPlace"
          @locate="navigate('nearby')"
        >
          <template #trailing>
            <ThemeToggle />
            <div class="mobile-top__account"><AccountCircle /></div>
          </template>
        </SearchBar>
      </div>

      <!-- Rides on top of the sheet: same transform + spring as the sheet, and no
           transition while dragging, so it tracks the finger without lagging. -->
      <div
        class="mobile-fab"
        :class="{ 'is-dragging': sheetDragging }"
        :style="{ transform: `translate3d(0, ${-sheetHeight}px, 0)` }"
      >
        <Transition name="fab">
          <M3FabMenu
            v-if="!selectedWalk && sheetSnap === 0"
            icon="material-symbols:explore-rounded"
            label="Browse walks"
            :items="fabItems"
            @select="navigate"
          />
        </Transition>
      </div>

      <M3BottomSheet
        v-model="sheetSnap"
        :label="selectedWalk ? selectedWalk.walk_name : 'Walks'"
        :snap-points="[132, '52%', '94%']"
        :header-height="36"
        @height="sheetHeight = $event"
        @dragging="sheetDragging = $event"
      >
        <template #default>
          <Transition name="swap" mode="out-in">
            <WalkDetail
              v-if="selectedWalk"
              :key="selectedWalk.id"
              :walk="selectedWalk"
              :detail="selectedDetail"
              :loading-detail="detailLoading"
              :favorite="walksStore.isFavorite(selectedWalk.id)"
              :pending="walksStore.isPendingFavorite(selectedWalk.id)"
              :category-names="walksStore.categoryNames"
              @close="goHome"
              @favorite="walksStore.toggleFavorite($event)"
              @directions="openDirections"
              @recenter="sheetSnap = 0; mapRef?.recenter()"
              @log-adventure="logAdventure"
              @category="filterByCategory"
            />
            <ExplorePane
              v-else
              ref="exploreRef"
              :selected-id="selectedId"
              @select="selectWalk"
              @nearby="navigate('nearby')"
            />
          </Transition>
        </template>
      </M3BottomSheet>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUiStore } from '../stores/ui';
import { useWalksStore } from '../stores/walks';
import { useSearchStore } from '../stores/searchStore';
import { useAuthStore } from '../stores/auth';
import { useAdventureDialogStore } from '../stores/adventureDialog';
import { useToastStore } from '../stores/toast';
import AppRail from './explore/AppRail.vue';
import ExplorePane from './explore/ExplorePane.vue';
import SearchBar from './explore/SearchBar.vue';
import WalkMap from './map/WalkMap.vue';
import WalkDetail from './walk/WalkDetail.vue';
import M3BottomSheet from './m3/M3BottomSheet.vue';
import M3FabMenu from './m3/M3FabMenu.vue';
import ThemeToggle from './shared/ThemeToggle.vue';
import AccountCircle from './shared/AccountCircle.vue';

defineProps({
  mapboxToken: { type: String, default: '' },
});

const route = useRoute();
const router = useRouter();
const uiStore = useUiStore();
const walksStore = useWalksStore();
const search = useSearchStore();
const authStore = useAuthStore();
const adventureDialog = useAdventureDialogStore();
const toast = useToastStore();

const mapRef = ref(null);
const exploreRef = ref(null);
const hoveredId = ref(null);
const paneOpen = ref(true);
const sheetSnap = ref(0);
const sheetHeight = ref(132);
const sheetDragging = ref(false);
const detailLoading = ref(false);

const isMobile = computed(() => uiStore.isMobile);

// ── Selection is driven by the URL ───────────────────────────────────────
const selectedWalk = computed(() => {
  const param = route.params.walk_id;
  if (!param) return null;
  return route.name === 'walk-by-id' ? walksStore.getWalkById(param) : walksStore.getWalkBySlug(param);
});
const selectedId = computed(() => selectedWalk.value?.id || null);
const selectedDetail = computed(() => (selectedWalk.value ? walksStore.details.get(selectedWalk.value.id) || null : null));

watch(selectedWalk, async (walk, previous) => {
  if (!walk) {
    if (previous && isMobile.value) sheetSnap.value = Math.min(sheetSnap.value, 1);
    return;
  }
  paneOpen.value = true;
  if (isMobile.value && sheetSnap.value === 0) sheetSnap.value = 1;
  detailLoading.value = true;
  try {
    await walksStore.fetchDetail(walk);
  } catch {
    toast.show('Some walk details could not be loaded', 'error', 3000);
  } finally {
    detailLoading.value = false;
  }
}, { immediate: true });

function selectWalk(walk) {
  if (!walk?.walk_id) return;
  if (route.params.walk_id === walk.walk_id) {
    mapRef.value?.recenter();
    return;
  }
  router.push({ name: 'walk', params: { walk_id: walk.walk_id } });
}

function goHome() {
  const previous = selectedId.value;
  router.push({ name: 'home' }).then(() => {
    if (previous) requestAnimationFrame(() => exploreRef.value?.scrollToWalk(previous));
  });
}

// ── Navigation (rail / FAB menu) ─────────────────────────────────────────
const railActive = computed(() => (search.mode === 'explore' ? 'explore' : search.mode));
const paneTitle = computed(() => {
  if (search.mode === 'nearby' && search.origin) return `Near ${search.origin.label === 'Your location' ? 'you' : search.origin.label}`;
  if (search.mode === 'saved') return 'Saved walks';
  return 'Explore Cornwall';
});
const fabItems = [
  { id: 'explore', label: 'All walks', icon: 'material-symbols:explore-rounded' },
  { id: 'nearby', label: 'Near me', icon: 'material-symbols:near-me-rounded' },
  { id: 'saved', label: 'Saved', icon: 'material-symbols:bookmark-rounded' },
  { id: 'adventures', label: 'My adventures', icon: 'material-symbols:auto-stories-rounded' },
];

async function navigate(target) {
  if (target === 'adventures') {
    router.push({ name: 'adventures' });
    return;
  }
  if (selectedWalk.value) await router.push({ name: 'home' });
  paneOpen.value = true;
  if (isMobile.value) sheetSnap.value = Math.max(sheetSnap.value, 1);

  if (target === 'nearby') {
    if (search.mode === 'nearby' && search.origin) {
      search.setMode('explore');
      return;
    }
    if (search.origin?.source === 'place') {
      search.setMode('nearby');
      mapRef.value?.flyTo({ ...search.origin, zoom: 10.5 });
      return;
    }
    try {
      const origin = await search.locate();
      mapRef.value?.flyTo({ ...origin, zoom: 10.5 });
    } catch {
      toast.show(search.error || 'Could not find your location', 'error', 4000);
    }
    return;
  }
  if (target === 'saved' && !authStore.isAuthenticated) {
    toast.show('Sign in to save walks and see them here', 'info', 4000);
  }
  search.setMode(target === 'saved' ? 'saved' : 'explore');
}

function selectPlace(place) {
  search.setOrigin({ latitude: place.latitude, longitude: place.longitude, label: place.name, source: 'place' });
  search.setMode('nearby');
  if (selectedWalk.value) router.push({ name: 'home' });
  mapRef.value?.flyTo({ ...place, zoom: 10.5 });
  if (isMobile.value) sheetSnap.value = 1;
}

function onLocated(position) {
  search.setOrigin({ ...position, label: 'Your location', source: 'gps' });
}

function filterByCategory(slug) {
  if (!search.categories.includes(slug)) search.toggleCategory(slug);
  goHome();
}

function logAdventure(walk) {
  adventureDialog.openDialog(walk);
}

function openDirections(walk) {
  const destination = `${walk.latitude},${walk.longitude}`;
  const isApple = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document;
  const url = isApple
    ? `https://maps.apple.com/?daddr=${destination}&q=${encodeURIComponent(walk.walk_name)}`
    : `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  window.open(url, '_blank', 'noopener');
}

// ── Map framing: keep routes clear of the sheet ──────────────────────────
const mapPadding = computed(() => (isMobile.value ? { top: 80, right: 72, bottom: sheetHeight.value, left: 0 } : { top: 16, right: 80, bottom: 16, left: 16 }));

// ── Data ─────────────────────────────────────────────────────────────────
watch(() => authStore.isAuthenticated, (signedIn) => {
  if (signedIn) walksStore.loadFavorites();
  else walksStore.clearFavorites();
}, { immediate: true });

onMounted(async () => {
  walksStore.loadTags();
  try {
    await walksStore.loadWalks();
  } catch {
    toast.show('Walks could not be loaded. Check your connection.', 'error', 5000);
    return;
  }
  if (route.params.walk_id && !selectedWalk.value) {
    toast.show('That walk could not be found', 'error', 4000);
    router.replace({ name: 'home' });
  }
});
</script>

<style scoped>
.shell {
  position: fixed;
  inset: 0;
  display: flex;
  background: var(--md-sys-color-surface);
  color: var(--md-sys-color-on-surface);
  overflow: hidden;
}
.pane {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  inline-size: clamp(360px, 30vw, 440px);
  flex: none;
  margin: 8px 0 8px 0;
  border-radius: var(--md-sys-shape-corner-extra-large);
  background: var(--md-sys-color-surface-container-low);
  overflow: hidden;
}
.pane > * { flex: 1; min-block-size: 0; }
.pane__header { padding: 20px 16px 12px; }
.pane__eyebrow { margin: 0 4px; color: var(--md-sys-color-primary); letter-spacing: 0.08em; text-transform: uppercase; }
.pane__title { margin: 0 4px 16px; color: var(--md-sys-color-on-surface); font-weight: 500; font-variation-settings: 'ROND' 100; }
.map-area {
  position: relative;
  flex: 1;
  min-inline-size: 0;
  margin: 8px;
  border-radius: var(--md-sys-shape-corner-extra-large);
  overflow: hidden;
}
.is-mobile .map-area { margin: 0; border-radius: 0; }
.mobile-top {
  position: fixed;
  top: calc(12px + env(safe-area-inset-top, 0px));
  inset-inline: 12px;
  z-index: 25;
}
.mobile-top :deep(.search__bar) { box-shadow: var(--md-sys-elevation-2); background: var(--md-sys-color-surface-container-high); }
.mobile-top__account :deep(.account-circle-container) { position: static; }
.mobile-top__account :deep(.account-circle-button.mobile) { inline-size: 40px; block-size: 40px; color: var(--md-sys-color-on-surface-variant); }
.mobile-fab {
  position: fixed;
  right: 16px;
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  z-index: 26;
  pointer-events: none;
  will-change: transform;
  transition: transform var(--md-sys-motion-spring-default-spatial-duration) var(--md-sys-motion-spring-default-spatial);
}
.mobile-fab.is-dragging { transition: none; }
/* FAB enter/exit: scale out of its own centre like an M3 FAB. */
.fab-enter-active,
.fab-leave-active {
  transform-origin: bottom right;
  transition:
    transform var(--md-sys-motion-spring-fast-spatial-duration) var(--md-sys-motion-spring-fast-spatial),
    opacity var(--md-sys-motion-spring-fast-effects-duration) var(--md-sys-motion-spring-fast-effects);
}
.fab-enter-from,
.fab-leave-to { transform: scale(0.4); opacity: 0; }
.pane-enter-active, .pane-leave-active {
  transition: margin-inline-start var(--md-sys-motion-spring-default-spatial-duration) var(--md-sys-motion-spring-default-spatial),
    opacity var(--md-sys-motion-spring-default-effects-duration) var(--md-sys-motion-spring-default-effects);
}
.pane-enter-from, .pane-leave-to { margin-inline-start: calc(-1 * clamp(360px, 30vw, 440px)); opacity: 0; }
.swap-enter-active, .swap-leave-active {
  transition: opacity var(--md-sys-motion-spring-fast-effects-duration) var(--md-sys-motion-spring-fast-effects),
    transform var(--md-sys-motion-spring-fast-spatial-duration) var(--md-sys-motion-spring-fast-spatial);
}
.swap-enter-from { opacity: 0; transform: translateX(24px); }
.swap-leave-to { opacity: 0; transform: translateX(-24px); }
</style>
