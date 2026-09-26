<template>
  <div class="walk-map" :style="{ '--map-inset-bottom': `${padding.bottom || 0}px`, '--map-inset-left': `${padding.left || 0}px` }">
    <div ref="container" class="walk-map__canvas" />
    <div v-if="unavailable" class="walk-map__fallback">
      <Icon icon="material-symbols:map-outline-rounded" aria-hidden="true" />
      <p class="type-body-medium">{{ unavailable }}</p>
    </div>
    <MapToolbar
      v-if="map"
      class="walk-map__toolbar"
      :locating="locating"
      :bearing="bearing"
      @zoom-in="map.zoomIn()"
      @zoom-out="map.zoomOut()"
      @reset-north="map.easeTo({ bearing: 0, pitch: 0 })"
      @locate="locate"
    />
    <div v-if="loadingRoute" class="walk-map__route-loading">
      <M3LoadingIndicator :size="40" contained label="Loading route" />
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { Icon } from '@iconify/vue';
import mapboxgl from 'mapbox-gl';
import MapToolbar from './MapToolbar.vue';
import M3LoadingIndicator from '../m3/M3LoadingIndicator.vue';
import { getGeometry } from '../../services/api';
import { useMap } from '../../composables/useMap';
import { radiiToPath, sampleShape } from '../../design/shapes';
import {
  CORNWALL_BOUNDS,
  CORNWALL_CENTER,
  buildIdIndex,
  geojsonBounds,
  routeEndpoints,
  routeLayers,
  walkLayers,
  walksToGeoJSON,
} from '../../utils/mapLayers';

const props = defineProps({
  token: { type: String, default: '' },
  mapStyle: { type: String, default: 'mapbox://styles/andreamaestri/cm79fegfl000z01sdhl4u32jv' },
  walks: { type: Array, required: true },
  matchIds: { type: Set, default: null },
  favoriteIds: { type: Set, default: null },
  selectedId: { type: String, default: null },
  hoveredId: { type: String, default: null },
  /** Area covered by UI (pane/sheet) so the camera frames routes in the visible part. */
  padding: { type: Object, default: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) },
});
const emit = defineEmits(['select', 'hover', 'located', 'ready']);

const container = ref(null);
const map = shallowRef(null);
const unavailable = ref('');
const loadingRoute = ref(false);
const locating = ref(false);
const bearing = ref(0);
const { setMapInstance } = useMap();

let idIndex = new Map();
let walkByFeatureId = new Map();
let hoverFeatureId = null;
let externalHoverId = null;
let selectedFeatureId = null;
let geolocate = null;
let tooltip = null;
let resizeObserver = null;
let routeRequest = 0;

const EMPTY = { type: 'FeatureCollection', features: [] };

function tokens() {
  const css = getComputedStyle(document.documentElement);
  const get = (name, fallback) => css.getPropertyValue(`--md-sys-color-${name}`).trim() || fallback;
  return {
    primary: get('primary', '#1a696c'),
    tertiary: get('tertiary', '#3c637e'),
    surface: get('surface', '#f6fafa'),
    onSurface: get('on-surface', '#2a3435'),
    isDark: document.documentElement.dataset.theme === 'dark',
  };
}

/** M3E "cookie" badge used to mark the selected walk. */
function drawSelectedPin(colors) {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const path = new Path2D(radiiToPath(sampleShape('cookie9', 96), size / 2, size / 2, size / 2 - 4));
  ctx.fillStyle = colors.primary;
  ctx.strokeStyle = colors.surface;
  ctx.lineWidth = 4;
  ctx.fill(path);
  ctx.stroke(path);
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 8, 0, Math.PI * 2);
  ctx.fillStyle = colors.surface;
  ctx.fill();
  return ctx.getImageData(0, 0, size, size);
}

function walkData() {
  idIndex = buildIdIndex(props.walks);
  walkByFeatureId = new Map(props.walks.map((walk) => [idIndex.get(walk.id), walk]));
  return walksToGeoJSON(props.walks, { idIndex, matchIds: props.matchIds, favoriteIds: props.favoriteIds });
}

function setState(featureId, state) {
  if (featureId != null && map.value?.getSource('walks')) {
    map.value.setFeatureState({ source: 'walks', id: featureId }, state);
  }
}

function applySelection() {
  const m = map.value;
  if (!m?.getLayer('walks-selected')) return;
  setState(selectedFeatureId, { selected: false });
  selectedFeatureId = props.selectedId ? idIndex.get(props.selectedId) ?? null : null;
  setState(selectedFeatureId, { selected: true });
  m.setFilter('walks-selected', ['==', ['get', 'walkId'], props.selectedId || '']);
}

function applyExternalHover() {
  setState(externalHoverId, { hover: false });
  externalHoverId = props.hoveredId ? idIndex.get(props.hoveredId) ?? null : null;
  setState(externalHoverId, { hover: true });
}

function addLayers() {
  const m = map.value;
  const colors = tokens();
  m.addSource('walks', { type: 'geojson', data: walkData() });
  m.addSource('route', { type: 'geojson', data: EMPTY });
  m.addSource('route-ends', { type: 'geojson', data: EMPTY });
  if (!m.hasImage('walk-selected')) m.addImage('walk-selected', drawSelectedPin(colors), { pixelRatio: 2 });
  for (const layer of routeLayers(colors)) m.addLayer(layer);
  for (const layer of walkLayers(colors)) m.addLayer(layer);
  m.addLayer({
    id: 'walks-selected',
    type: 'symbol',
    source: 'walks',
    filter: ['==', ['get', 'walkId'], ''],
    layout: { 'icon-image': 'walk-selected', 'icon-allow-overlap': true, 'icon-ignore-placement': true },
  });
  applyThemeToStyle(colors);
  applySelection();
  applyExternalHover();
}

function applyThemeToStyle(colors = tokens()) {
  const m = map.value;
  if (!m?.getLayer('walks-points')) return;
  m.setPaintProperty('walks-halo', 'circle-color', colors.primary);
  m.setPaintProperty('walks-points', 'circle-color', ['case', ['==', ['get', 'fav'], 1], colors.tertiary, colors.primary]);
  m.setPaintProperty('walks-points', 'circle-stroke-color', colors.surface);
  m.setPaintProperty('walks-labels', 'text-color', colors.onSurface);
  m.setPaintProperty('walks-labels', 'text-halo-color', colors.surface);
  m.setPaintProperty('route-casing', 'line-color', colors.surface);
  m.setPaintProperty('route-line', 'line-color', colors.primary);
  m.setPaintProperty('route-ends', 'circle-stroke-color', colors.surface);
  m.updateImage('walk-selected', drawSelectedPin(colors));
  // Styles built on Mapbox Standard can switch light preset without a reload.
  try {
    if (m.getStyle()?.imports?.some((entry) => entry.id === 'basemap')) {
      m.setConfigProperty('basemap', 'lightPreset', colors.isDark ? 'night' : 'day');
    }
  } catch {
    /* not a Standard-based style */
  }
}

const onThemeChange = () => applyThemeToStyle();

function tooltipHtml(walk) {
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const img = walk.thumb?.url ? `<img src="${esc(walk.thumb.url)}" alt="" width="56" height="56">` : '';
  return `<div class="map-tip">${img}<div><strong>${esc(walk.walk_name)}</strong><span>${walk.distance?.toFixed(1)} mi · ${esc(walk.difficulty?.short || '')}</span></div></div>`;
}

function bindInteractions() {
  const m = map.value;
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  tooltip = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 14, className: 'm3-map-tooltip', maxWidth: '280px' });

  m.on('mousemove', 'walks-points', (event) => {
    const feature = event.features?.[0];
    if (!feature) return;
    m.getCanvas().style.cursor = 'pointer';
    if (hoverFeatureId !== feature.id) {
      setState(hoverFeatureId, { hover: false });
      hoverFeatureId = feature.id;
      setState(hoverFeatureId, { hover: true });
      const walk = walkByFeatureId.get(feature.id);
      emit('hover', walk || null);
      if (canHover && walk) tooltip.setLngLat(feature.geometry.coordinates).setHTML(tooltipHtml(walk)).addTo(m);
    }
  });
  m.on('mouseleave', 'walks-points', () => {
    m.getCanvas().style.cursor = '';
    setState(hoverFeatureId, { hover: false });
    hoverFeatureId = null;
    tooltip.remove();
    emit('hover', null);
  });
  m.on('click', 'walks-points', (event) => {
    const walk = walkByFeatureId.get(event.features?.[0]?.id);
    if (walk) {
      tooltip.remove();
      emit('select', walk);
    }
  });
  m.on('rotate', () => { bearing.value = m.getBearing(); });
}

async function showRoute(walkId) {
  const m = map.value;
  const request = ++routeRequest;
  if (!m?.getSource('route')) return;
  if (!walkId) {
    m.getSource('route').setData(EMPTY);
    m.getSource('route-ends').setData(EMPTY);
    return;
  }
  const walk = props.walks.find((w) => w.id === walkId);
  loadingRoute.value = true;
  try {
    const feature = await getGeometry(walkId);
    if (request !== routeRequest || !map.value) return;
    m.getSource('route').setData(feature);
    m.getSource('route-ends').setData(routeEndpoints(feature));
    const bounds = geojsonBounds(feature);
    if (bounds) m.fitBounds(bounds, { padding: cameraPadding(64), maxZoom: 15, duration: 1200, essential: true });
  } catch {
    if (walk && request === routeRequest) {
      m.easeTo({ center: [walk.longitude, walk.latitude], zoom: 13, padding: cameraPadding(0), duration: 900 });
    }
  } finally {
    if (request === routeRequest) loadingRoute.value = false;
  }
}

function cameraPadding(extra = 0) {
  const p = props.padding;
  return {
    top: (p.top || 0) + extra,
    right: (p.right || 0) + extra,
    bottom: (p.bottom || 0) + extra,
    left: (p.left || 0) + extra,
  };
}

/** Re-frames the selected route (e.g. "show on map" in the detail view). */
function recenter() {
  if (props.selectedId) showRoute(props.selectedId);
}

function flyTo({ longitude, latitude, zoom = 11.5 }) {
  map.value?.flyTo({ center: [longitude, latitude], zoom, padding: cameraPadding(0), duration: 1400, essential: true });
}

function locate() {
  if (!geolocate) return;
  locating.value = true;
  geolocate.trigger();
}

onMounted(() => {
  const token = props.token || '';
  if (!token || token.startsWith('replace-with')) {
    unavailable.value = 'Map unavailable: set VITE_MAPBOX_TOKEN to show walks on the map.';
    return;
  }
  mapboxgl.accessToken = token;
  let instance;
  try {
    instance = new mapboxgl.Map({
      container: container.value,
      style: props.mapStyle,
      center: CORNWALL_CENTER,
      zoom: 8.6,
      minZoom: 7,
      maxZoom: 18,
      maxPitch: 60,
      pitch: 0,
      maxBounds: CORNWALL_BOUNDS,
      projection: 'mercator',
      attributionControl: false,
      logoPosition: 'bottom-left',
      performanceMetricsCollection: false,
      cooperativeGestures: false,
    });
  } catch (error) {
    unavailable.value = 'Map unavailable in this browser.';
    return;
  }
  map.value = instance;
  setMapInstance(instance);
  if (import.meta.env.DEV) window.__walkquestMap = instance; // debugging / e2e hook
  instance.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');

  geolocate = new mapboxgl.GeolocateControl({
    positionOptions: { enableHighAccuracy: true },
    trackUserLocation: false,
    showUserHeading: false,
    fitBoundsOptions: { maxZoom: 12 },
  });
  instance.addControl(geolocate, 'top-right');
  geolocate.on('geolocate', (position) => {
    locating.value = false;
    emit('located', { latitude: position.coords.latitude, longitude: position.coords.longitude });
  });
  geolocate.on('error', () => { locating.value = false; });

  instance.on('load', () => {
    addLayers();
    bindInteractions();
    if (props.selectedId) showRoute(props.selectedId);
    emit('ready', instance);
  });
  instance.on('error', (event) => {
    if (event?.error?.status === 401) unavailable.value = 'Map unavailable: the Mapbox token was rejected.';
  });

  let frame = 0;
  resizeObserver = new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => map.value?.resize());
  });
  resizeObserver.observe(container.value);
  window.addEventListener('walkquest:theme-change', onThemeChange);
});

onBeforeUnmount(() => {
  window.removeEventListener('walkquest:theme-change', onThemeChange);
  resizeObserver?.disconnect();
  tooltip?.remove();
  map.value?.remove();
  map.value = null;
  setMapInstance(null);
});

// Data changes are a single setData call — no per-marker DOM work.
watch(
  () => [props.walks, props.matchIds, props.favoriteIds],
  () => {
    const source = map.value?.getSource('walks');
    if (!source) return;
    source.setData(walkData());
    applySelection();
    applyExternalHover();
  },
);
watch(() => props.selectedId, (id) => {
  applySelection();
  showRoute(id);
});
watch(() => props.hoveredId, applyExternalHover);

defineExpose({ recenter, flyTo, locate });
</script>

<style scoped>
.walk-map { position: relative; inline-size: 100%; block-size: 100%; background: var(--md-sys-color-surface-container); }
.walk-map__canvas { position: absolute; inset: 0; }
.walk-map__fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 8px;
  padding: 24px;
  text-align: center;
  color: var(--md-sys-color-on-surface-variant);
}
.walk-map__fallback svg { font-size: 48px; color: var(--md-sys-color-primary); }
.walk-map__toolbar { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); z-index: 2; }
@media (max-width: 767px) {
  .walk-map__toolbar { top: calc(84px + env(safe-area-inset-top, 0px)); right: 12px; transform: none; }
  .walk-map__route-loading { top: calc(84px + env(safe-area-inset-top, 0px)); }
}
.walk-map__route-loading { position: absolute; top: 16px; left: 50%; transform: translateX(-50%); z-index: 2; }
/* Keep Mapbox's logo + attribution above bottom sheets. */
.walk-map :deep(.mapboxgl-ctrl-bottom-left),
.walk-map :deep(.mapboxgl-ctrl-bottom-right) { bottom: var(--map-inset-bottom, 0px); transition: bottom var(--md-sys-motion-spring-default-spatial-duration) var(--md-sys-motion-spring-default-spatial); }
.walk-map :deep(.mapboxgl-ctrl-bottom-left) { left: var(--map-inset-left, 0px); }
/* The geolocate control is driven from the M3 toolbar. */
.walk-map :deep(.mapboxgl-ctrl-top-right .mapboxgl-ctrl-group) { display: none; }
</style>

<style>
.m3-map-tooltip .mapboxgl-popup-content {
  padding: 8px;
  border-radius: var(--md-sys-shape-corner-large);
  background: var(--md-sys-color-inverse-surface);
  color: var(--md-sys-color-inverse-on-surface);
  box-shadow: var(--md-sys-elevation-2);
  font-family: var(--md-ref-typeface-plain);
}
.m3-map-tooltip .mapboxgl-popup-tip { display: none; }
.m3-map-tooltip .map-tip { display: flex; align-items: center; gap: 10px; }
.m3-map-tooltip .map-tip img { inline-size: 56px; block-size: 56px; border-radius: var(--md-sys-shape-corner-medium); object-fit: cover; flex: none; }
.m3-map-tooltip .map-tip div { display: flex; flex-direction: column; gap: 2px; padding-inline-end: 6px; }
.m3-map-tooltip .map-tip strong { font-size: 14px; line-height: 20px; font-weight: 700; }
.m3-map-tooltip .map-tip span { font-size: 12px; line-height: 16px; opacity: 0.85; }
</style>
