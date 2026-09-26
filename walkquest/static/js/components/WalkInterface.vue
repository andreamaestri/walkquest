<template>
  <MotionConfig reduced-motion="user">
  <LazyMotion :features="domAnimation">
  <div class="shell" :class="isMobile ? 'is-mobile' : 'is-desktop'">
    <!-- ── Desktop: rail · list/detail pane · map ─────────────────────── -->
    <AppRail
      v-if="!isMobile"
      :active="railActive"
      :pane-open="paneOpen"
      @navigate="navigate"
      @home="goHome"
      @toggle-pane="paneOpen = !paneOpen"
    />

    <div class="stage" :class="{ 'is-pane-open': !isMobile && paneOpen }">
      <!-- The map fills the stage under the pane and is revealed with a clip, so
           opening/closing the pane never resizes the WebGL canvas. -->
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
          :control-inset="controlInset"
          @select="selectWalk"
          @hover="walksStore.prefetchDetail($event)"
          @located="onLocated"
        />
      </main>

      <aside v-if="!isMobile" class="pane" aria-label="Walks" :inert="!paneOpen">
        <AnimatePresence mode="wait" :custom="navDirection" :initial="false">
          <m.div
            :key="selectedWalk ? selectedWalk.id : 'list'"
            class="pane__view"
            :variants="sharedAxisX"
            :custom="navDirection"
            initial="initial"
            animate="enter"
            exit="exit"
          >
            <WalkDetail
              v-if="selectedWalk"
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
          </m.div>
        </AnimatePresence>
      </aside>
    </div>

    <!-- ── Mobile: floating search + bottom sheet ─────────────────────── -->
    <template v-if="isMobile">
      <Transition name="top-bar">
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
      </Transition>

      <div class="mobile-fab" :style="{ transform: `translateY(${-sheetHeight}px)` }">
        <Transition name="fab">
          <M3FabMenu
            v-show="!selectedWalk && sheetSnap === 0"
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
        @settle="sheetSettle = $event"
      >
        <template #default>
          <AnimatePresence mode="wait" :custom="navDirection" :initial="false">
            <m.div
              :key="selectedWalk ? selectedWalk.id : 'list'"
              class="sheet__view"
              :variants="sharedAxisX"
              :custom="navDirection"
              initial="initial"
              animate="enter"
              exit="exit"
            >
            <WalkDetail
              v-if="selectedWalk"
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
            </m.div>
          </AnimatePresence>
        </template>
      </M3BottomSheet>
    </template>
  </div>
  </LazyMotion>
  </MotionConfig>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { AnimatePresence, LazyMotion, MotionConfig, domAnimation, m } from 'motion-v';
import { useWindowSize } from '@vueuse/core';
import { sharedAxisX } from '../design/motion';
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
const sheetSettle = ref(132);
/** 1 when navigating into a walk, -1 when going back: sets the shared-axis direction. */
const navDirection = ref(1);
/** Walk to bring into view once the list has animated back in. */
let returnToId = null;
const { width: viewportWidth, height: viewportHeight } = useWindowSize();
const detailLoading = ref(false);

const isMobile = computed(() => uiStore.isMobile);

// ── Selection is driven by the URL ───────────────────────────────────────
const selectedWalk = computed(() => {
  const param = route.params.walk_id;
  if (!param) return null;
  return route.name === 'walk-by-id' ? walksStore.getWalkById(param) : walksStore.getWalkBySlug(param);
});
const selectedId = computed(() => selectedWalk.value?.id || null);
watch(selectedId, (id, previous) => {
  navDirection.value = id ? 1 : -1;
  if (!id && previous) returnToId = previous;
});
watch(exploreRef, async (list) => {
  if (!list || !returnToId) return;
  const id = returnToId;
  returnToId = null;
  await nextTick();
  list.scrollToWalk(id);
});
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
  router.push({ name: 'home' });
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

// ── Map framing: keep routes clear of the pane / sheet ──────────────────
// Desktop: the map spans the whole stage; the pane (clamp(360px, 30vw, 440px),
// mirrored by --pane-w) plus an 8px gap covers its left edge while open.
const paneCover = computed(() => {
  if (!paneOpen.value) return 8;
  return Math.min(440, Math.max(360, viewportWidth.value * 0.3)) + 8;
});
// Mobile: frame against where the sheet is going, not every frame of a drag;
// cap it so a full-height sheet still leaves the top of the map usable.
const mapPadding = computed(() => (isMobile.value
  ? { top: 80, right: 72, bottom: Math.min(sheetSettle.value, viewportHeight.value * 0.55), left: 0 }
  : { top: 16, right: 80, bottom: 16, left: paneCover.value + 16 }));
const controlInset = computed(() => (isMobile.value
  ? { left: 0, bottom: sheetHeight.value }
  : { left: paneCover.value + 16, bottom: 16 }));

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
.stage {
  --pane-w: clamp(360px, 30vw, 440px);
  --_reveal: 8px;
  position: relative;
  flex: 1;
  min-inline-size: 0;
  overflow: hidden;
}
.stage.is-pane-open { --_reveal: calc(var(--pane-w) + 8px); }
.pane {
  position: absolute;
  z-index: 10;
  inset-block: 8px;
  inset-inline-start: 0;
  display: flex;
  flex-direction: column;
  inline-size: var(--pane-w);
  border-radius: var(--md-sys-shape-corner-extra-large);
  background: var(--md-sys-color-surface-container-low);
  overflow: hidden;
  /* Slides out under the rail edge; hidden once it has left so it can't take focus. */
  transform: translateX(calc(-100% - 16px));
  visibility: hidden;
  transition:
    transform var(--md-sys-motion-spring-default-spatial-duration) var(--md-sys-motion-spring-default-spatial),
    visibility 0s linear var(--md-sys-motion-spring-default-spatial-duration);
}
.is-pane-open .pane {
  transform: none;
  visibility: visible;
  transition:
    transform var(--md-sys-motion-spring-default-spatial-duration) var(--md-sys-motion-spring-default-spatial),
    visibility 0s;
}
.pane__view, .sheet__view { display: flex; flex-direction: column; flex: 1; min-block-size: 0; }
.pane__view > *, .sheet__view > * { flex: 1; min-block-size: 0; }
.pane__header { padding: 20px 16px 12px; }
.pane__eyebrow { margin: 0 4px; color: var(--md-sys-color-primary); letter-spacing: 0.08em; text-transform: uppercase; }
.pane__title { margin: 0 4px 16px; color: var(--md-sys-color-on-surface); font-weight: 500; font-variation-settings: 'ROND' 100; }
.map-area {
  position: absolute;
  inset: 8px 8px 8px 0;
  /* Same spring as the pane, so the map edge follows it exactly. */
  clip-path: inset(0 0 0 var(--_reveal) round var(--md-sys-shape-corner-extra-large));
  transition: clip-path var(--md-sys-motion-spring-default-spatial-duration) var(--md-sys-motion-spring-default-spatial);
}
.is-mobile .map-area { inset: 0; clip-path: none; }
.mobile-top {
  position: fixed;
  top: calc(12px + env(safe-area-inset-top, 0px));
  inset-inline: 12px;
  z-index: 25;
}
.mobile-top :deep(.search__bar) { box-shadow: var(--md-sys-elevation-2); background: var(--md-sys-color-surface-container-high); }
.mobile-top__account :deep(.account-circle-container) { position: static; }
.mobile-top__account :deep(.account-circle-button.mobile) { inline-size: 40px; block-size: 40px; color: var(--md-sys-color-on-surface-variant); }
/* Rides on top of the sheet; translated every frame from its live height. */
.mobile-fab {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 26;
  pointer-events: none; /* the menu re-enables it on its own buttons */
}
/* M3E FAB: scales in from its centre on the fast spatial spring. */
.fab-enter-active {
  transition: scale var(--md-sys-motion-spring-fast-spatial-duration) var(--md-sys-motion-spring-fast-spatial),
    opacity var(--md-sys-motion-spring-fast-effects-duration) var(--md-sys-motion-spring-fast-effects);
}
.fab-leave-active {
  transition: scale var(--md-sys-motion-spring-default-effects-duration) var(--md-sys-motion-spring-default-effects),
    opacity var(--md-sys-motion-spring-fast-effects-duration) var(--md-sys-motion-spring-fast-effects);
}
.fab-enter-from, .fab-leave-to { scale: 0.4; opacity: 0; }
.top-bar-enter-active, .top-bar-leave-active {
  transition: translate var(--md-sys-motion-spring-default-spatial-duration) var(--md-sys-motion-spring-default-spatial),
    opacity var(--md-sys-motion-spring-default-effects-duration) var(--md-sys-motion-spring-default-effects);
}
.top-bar-enter-from, .top-bar-leave-to { translate: 0 -24px; opacity: 0; }
</style>
