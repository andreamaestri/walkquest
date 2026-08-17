import { computed, ref } from 'vue';

const STORAGE_KEY = 'walkquest-theme';
const theme = ref('light');
let initialized = false;

function systemTheme() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(value) {
  theme.value = value;
  document.documentElement.dataset.theme = value;
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) {
    themeColor.setAttribute('content', value === 'dark' ? '#141318' : '#fffbff');
  }
}

export function initializeTheme() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  const savedTheme = window.localStorage.getItem(STORAGE_KEY);
  applyTheme(savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : systemTheme());

  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
    if (!window.localStorage.getItem(STORAGE_KEY)) {
      applyTheme(event.matches ? 'dark' : 'light');
    }
  });
}

export function useTheme() {
  initializeTheme();

  const isDark = computed(() => theme.value === 'dark');

  const setTheme = (value) => {
    const nextTheme = value === 'dark' ? 'dark' : 'light';
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  };

  const toggleTheme = () => setTheme(isDark.value ? 'light' : 'dark');

  return { theme, isDark, setTheme, toggleTheme };
}
