import { m as module_default, a as module_default$1, b as module_default$2 } from './vendor-alpine-CP9gwB0o.js';
import { m as mapboxgl } from './vendor-TMghtGWH.js';

class ApiService {
  static async init() {
    // Any initialization logic
  }
  static async filterWalks(params) {
    const response = await fetch('/api/walks', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.json();
  }
  static async getWalkGeometry(walkId, zoom) {
    const response = await fetch(`/api/walks/${walkId}/geometry`);
    return response.json();
  }
}

console.log('MapService module initializing...', {
  version: mapboxgl.version,
  supported: mapboxgl.supported()
});

// Import npm packages
console.log('Main script initializing...');

// Initialize Alpine plugins
module_default.plugin(module_default$1);
module_default.plugin(module_default$2);

// Helper to safely load and initialize components
const loadComponent = async (name, importPath) => {
  try {
    console.log(`Loading ${name} component...`);
    const module = await import(importPath);
    if (!module || !module.default) {
      throw new Error(`Component ${name} must have a default export`);
    }
    return module.default;
  } catch (error) {
    console.error(`Failed to load ${name}:`, error);
    return () => ({
      error: true
    });
  }
};

// Initialize Alpine before registering components
console.log('Initializing Alpine...');

// Register Alpine components and stores
document.addEventListener('alpine:init', async () => {
  console.log('Alpine initialization started');
  try {
    // Register stores first
    console.log('Registering Alpine stores...');
    module_default.store('walks', {
      selectedWalk: null,
      selectedWalkId: null,
      loading: false,
      items: [],
      setSelectedWalk(walk) {
        this.selectedWalk = walk;
        this.selectedWalkId = walk?.id;
      }
    });
    module_default.store('globals', {
      fullscreen: false,
      mobileMenu: {
        isOpen: false,
        toggleMenu() {
          this.isOpen = !this.isOpen;
        }
      }
    });
    module_default.store('ui', {
      showSidebar: false,
      searchQuery: '',
      error: null,
      isLoading: false,
      mapLoading: false,
      loadingStates: {
        path: false,
        search: false,
        walks: new Set()
      }
    });
    console.log('Stores initialized');

    // Initialize services
    console.log('Initializing services...');
    await ApiService.init();
    try {
      // Load components sequentially to maintain order
      const loading = await loadComponent('Loading', './components/Loading.js');
      const mobileMenu = await loadComponent('MobileMenu', './components/MobileMenu.js');
      const walkInterface = await loadComponent('WalkInterface', './components/WalkInterface.js');

      // Enhance components with default state and an init method if missing
      const enhanceComponent = function (component) {
        let defaults = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        return () => ({
          ...defaults,
          ...component,
          init() {
            if (typeof component.init === 'function') {
              component.init.call(this);
            }
          }
        });
      };

      // Register enhanced components with Alpine
      module_default.data('loading', enhanceComponent(loading, {
        loading: false,
        loadingStates: [],
        error: null,
        isLoading: false
      }));
      module_default.data('mobileMenu', enhanceComponent(mobileMenu, {
        isOpen: false,
        toggleMenu() {
          this.isOpen = !this.isOpen;
        }
      }));
      module_default.data('walkInterface', enhanceComponent(walkInterface, {
        isLoading: false,
        error: null,
        mapLoading: false,
        showSidebar: false,
        loadingStates: {
          path: false,
          walks: new Set()
        }
      }));
      module_default.data('globalState', () => ({
        ...module_default.store('ui'),
        ...module_default.store('walks'),
        ...module_default.store('globals'),
        get walks() {
          return module_default.store('walks').items;
        }
      }));
      console.log('Components registered successfully');
    } catch (error) {
      console.error('Failed to register components:', error);
    }
  } catch (error) {
    console.error('Error during Alpine initialization:', error);
  }
});

// Initialize Alpine
module_default.start();

// Load other modules
const moduleImports = {
  'motion-helpers': () => import('./motion-helpers-CPMty6XE.js'),
  'project': () => import('./project-JAGN0NTb.js'),
  'walkCardMixin': () => import('./walkCardMixin-CHVSFI16.js'),
  'walk-animations': () => import('./walk-animations-D_dVepUX.js'),
  'custom-layer-handler': () => import('./custom-layer-handler-DHLfEDrj.js')
};

// Load modules sequentially to avoid bundling issues
const loadModules = async () => {
  try {
    for (const [name, importFn] of Object.entries(moduleImports)) {
      await importFn();
      console.log(`Loaded module: ${name}`);
    }
    console.log('Modules loaded successfully');
    document.dispatchEvent(new Event('motion:ready'));
  } catch (error) {
    console.error('Failed to load modules:', error);
  }
};
loadModules();
console.log('Main script setup complete');
//# sourceMappingURL=bundle.js.map
