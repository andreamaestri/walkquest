import { computed, ref } from 'vue';

const STORAGE_KEY = 'walkquest-theme';
const MODES = ['light', 'dark', 'system'];

/** The user's choice: 'light' | 'dark' | 'system'. */
const mode = ref('system');
/** The theme actually applied: 'light' | 'dark'. */
const theme = ref('light');
let initialized = false;
let media = null;

function readStoredMode() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return MODES.includes(saved) ? saved : 'system';
  } catch {
    return 'system';
  }
}

function resolve(value) {
  if (value === 'system') return media?.matches ? 'dark' : 'light';
  return value;
}

function apply() {
  const next = resolve(mode.value);
  theme.value = next;
  const root = document.documentElement;
  root.dataset.theme = next;
  // Keep the browser UI colour in sync with the generated surface token.
  const surface = getComputedStyle(root).getPropertyValue('--md-sys-color-surface').trim();
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && surface) meta.setAttribute('content', surface);
  window.dispatchEvent(new CustomEvent('walkquest:theme-change', { detail: { theme: next } }));
}

export function initializeTheme() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  media = window.matchMedia?.('(prefers-color-scheme: dark)') ?? null;
  mode.value = readStoredMode();
  apply();
  media?.addEventListener('change', () => {
    if (mode.value === 'system') apply();
  });
}

export function useTheme() {
  initializeTheme();

  const isDark = computed(() => theme.value === 'dark');

  const setMode = (value) => {
    mode.value = MODES.includes(value) ? value : 'system';
    try {
      window.localStorage.setItem(STORAGE_KEY, mode.value);
    } catch {
      /* storage unavailable (private mode) — keep the in-memory choice */
    }
    apply();
  };

  /** Cycles light → dark → system. */
  const cycleMode = () => setMode(MODES[(MODES.indexOf(mode.value) + 1) % MODES.length]);
  const toggleTheme = () => setMode(isDark.value ? 'light' : 'dark');

  return { mode, theme, isDark, setMode, setTheme: setMode, cycleMode, toggleTheme };
}
