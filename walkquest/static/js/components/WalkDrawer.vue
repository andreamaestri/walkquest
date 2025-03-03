<template>
  <Transition :css="false" @enter="onEnter" @leave="onLeave">
    <div v-if="isOpen" ref="drawerRef" class="walk-drawer" :class="{ loading: isLoading }">
      <div ref="connectorRef" class="rail-connector" v-if="!isMobile"></div>
      
      <!-- Header -->
      <WalkDrawerHeader 
        :walk="walk" 
        :isLoading="isLoading"
        :isMobile="isMobile"
        @close="handleBackClick"
      />

      <!-- Loading Overlay -->
      <div v-if="isLoading" class="loading-overlay">
        <Icon icon="mdi:loading" class="loading-icon animate-spin" />
      </div>
      
      <!-- Scrollable Content -->
      <div class="scrollable-container">
        <WalkDrawerContent 
          :walk="walk"
          :isMobile="isMobile"
          @start-walk="handleStartWalkClick"
          @save-walk="() => {}"
          @share="handleShare"
          @directions="() => {}"
          @category-selected="handleCategoryClick"
        />
      </div>
      
      <div ref="accentLineRef" class="drawer-accent-line" v-if="!isMobile"></div>
    </div>
  </Transition>
</template>

<script setup>
import {
  ref,
  computed,
  onMounted,
  watch,
  nextTick,
  onBeforeUnmount,
} from "vue";
import { Icon } from "@iconify/vue";
import { useRouter } from "vue-router";
import { useWalksStore } from "../stores/walks";
import { useUiStore } from "../stores/ui";
import { useDrawerAnimations } from "../composables/useDrawerAnimations";
import { animate } from "motion";
import WalkDrawerHeader from "./shared/WalkDrawerHeader.vue";
import WalkDrawerContent from "./shared/WalkDrawerContent.vue";

const props = defineProps({
  walk: { type: Object, required: true },
  isOpen: { type: Boolean, default: false },
  sidebarWidth: { type: Number, default: 80 },
  fromMapMarker: { type: Boolean, default: false },
  isLoading: { type: Boolean, default: false },
  isMobile: { type: Boolean, default: false }
});

const emit = defineEmits(["close", "start-walk", "loading-change", "category-selected"]);

// Get UI store
const uiStore = useUiStore();

// Component refs
const drawerRef = ref(null);
const connectorRef = ref(null);
const accentLineRef = ref(null);

// Scroll state
const scrollPosition = ref(0);
const previousWalkId = ref(null);

// Use drawer animations composable
const {
  animations,
  isTransitioning,
  initialAnimationCompleted,
  onEnter,
  onLeave,
  animateContentOut,
  animateContentIn,
  setupScrollAnimations,
} = useDrawerAnimations();

const router = useRouter();
const walksStore = useWalksStore();

// Watch for walk changes to handle transitions
watch(
  () => props.walk?.id,
  async (newWalkId, oldWalkId) => {
    console.log("Walk ID changed:", {
      new: newWalkId,
      old: oldWalkId,
      isTransitioning: isTransitioning.value,
    });

    // If both IDs are valid and different, and a transition isn't already in progress, handle the transition
    if (newWalkId && oldWalkId && newWalkId !== oldWalkId) {
      try {
        // Set transition state
        isTransitioning.value = true;
        emit("loading-change", true);

        // Reset the animation flag for the new walk
        initialAnimationCompleted.value = false;

        // Save current walk ID and scroll position before transition
        previousWalkId.value = oldWalkId;
        if (drawerRef.value) {
          const scrollContainer = drawerRef.value.querySelector(
            ".scrollable-container"
          );
          if (scrollContainer) {
            scrollPosition.value = scrollContainer.scrollTop;
          }
        }

        // Animate content out with timeout protection
        const contentOutPromise = animateContentOut(drawerRef.value);
        const contentOutTimeout = new Promise((resolve) =>
          setTimeout(resolve, 500)
        );
        await Promise.race([contentOutPromise, contentOutTimeout]);

        // Wait for data
        await nextTick();

        // Reset scroll for new content
        const scrollContainer = drawerRef.value?.querySelector(
          ".scrollable-container"
        );
        if (scrollContainer) {
          scrollContainer.scrollTop = 0;
        }

        // Animate new content in with timeout protection
        const contentInPromise = animateContentIn(drawerRef.value);
        const contentInTimeout = new Promise((resolve) =>
          setTimeout(resolve, 800)
        );
        await Promise.race([contentInPromise, contentInTimeout]);
      } catch (error) {
        console.error("Transition error:", error);
      } finally {
        // Always reset transition state, even if there was an error
        isTransitioning.value = false;
        emit("loading-change", false);
      }
    } else if (newWalkId && !oldWalkId) {
      // This case handles when a new walk is selected from nothing
      isTransitioning.value = false;
      emit("loading-change", false);
      // Make sure initial animation runs for first walk
      initialAnimationCompleted.value = false;
    }
  },
  { immediate: true }
);

// Watch for open state changes
watch(
  () => props.isOpen,
  async (isOpen) => {
    console.log("Drawer isOpen changed:", isOpen);

    if (isOpen) {
      // Ensure transition state is reset when drawer opens
      isTransitioning.value = false;

      await nextTick();
      initializeDrawer();

      // Restore scroll position if reopening same walk
      if (previousWalkId.value === props.walk?.id && scrollPosition.value > 0) {
        await nextTick(() => {
          restoreScrollPosition();
        });
      }
    } else {
      // When drawer is closed, ensure we clean up any running animations
      animations.cleanup();
    }
  },
  { immediate: true }
);

function initializeDrawer() {
  if (drawerRef.value) {
    // Only apply desktop-specific styles if not in mobile mode
    if (!props.isMobile) {
      // No need to set left position here - CSS will handle this with --md-sys-sidebar-collapsed
      drawerRef.value.style.transition = "transform 0.3s ease, box-shadow 0.3s ease";
      
      // Handle connector animation
      if (connectorRef.value) {
        // Set initial state for animation
        connectorRef.value.style.opacity = "0";
        connectorRef.value.style.width = "0px";
        
        // Use Motion One to animate connector
        animate(
          connectorRef.value,
          {
            opacity: [0, 1],
            width: ["0px", "28px"],
          },
          {
            delay: 0.2,
            duration: 0.6,
            easing: [0.2, 0, 0.2, 1], // Material Design standard easing
          }
        );
      }
      
      // Add accent line animation
      if (accentLineRef.value) {
        accentLineRef.value.style.transform = "scaleY(0)";
        accentLineRef.value.style.opacity = "0";
        
        animate(
          accentLineRef.value,
          {
            scaleY: [0, 1],
            opacity: [0, 0.8],
          },
          {
            delay: 0.3, // Slightly faster to better coordinate with connector
            duration: 0.5,
            easing: [0.2, 0, 0.2, 1], // Material Design standard easing
          }
        );
      }
    }
  }
}

function restoreScrollPosition() {
  const scrollContainer = drawerRef.value?.querySelector(
    ".scrollable-container"
  );
  if (scrollContainer && scrollPosition.value > 0) {
    scrollContainer.scrollTop = scrollPosition.value;
    console.log("Restored scroll position:", scrollPosition.value);
  }
}

function handleBackClick() {
  console.log("Back button clicked");

  emit("close", {
    expandSidebar: true,
    fromMapMarker: props.fromMapMarker,
    animated: true,
  });
}

function handleStartWalkClick() {
  if (isTransitioning.value) return;
  emit("start-walk", props.walk);
}

function handleCategoryClick(category) {
  emit('category-selected', category);
}

function handleShare() {
  if (!props.walk) return;

  // Use slug if available, otherwise use ID
  const walkPath = props.walk.slug
    ? `/${props.walk.slug}`
    : `/walk/${props.walk.id}`;

  const shareUrl = `${window.location.origin}${walkPath}`;

  if (navigator.share) {
    navigator
      .share({
        title: props.walk.title || props.walk.walk_name,
        text: props.walk.description,
        url: shareUrl,
      })
      .catch(console.error);
  } else {
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        // Show copy success message
      })
      .catch(console.error);
  }
}

// Clean up animations and observers when component is unmounted
onBeforeUnmount(() => {
  animations.cleanup();

  // Save scroll position in case we're coming back to this walk
  if (drawerRef.value) {
    scrollPosition.value =
      drawerRef.value.querySelector(".scrollable-container")?.scrollTop || 0;
  }
});

// Set up scroll-based animations when component is mounted
onMounted(() => {
  // Initialize animations only when component is fully mounted
  nextTick(() => {
    setupScrollAnimations(drawerRef.value);
  });

  // Add event listeners for browser back/forward navigation
  const handleRouteChange = () => {
    // Stop any running animations
    console.log("Route change detected, cleaning up animations");
    animations.cleanup();
  };

  window.addEventListener("popstate", handleRouteChange);

  // Cleanup function to be called on unmount
  onBeforeUnmount(() => {
    window.removeEventListener("popstate", handleRouteChange);
    
    // Disable animations during unmount to prevent hanging animations
    isTransitioning.value = false;
  });
});
</script>

<style scoped>
/* Use the shared CSS styles for basic drawer layout */
@import "../../../static/css/walkdrawer.css";

.walk-drawer {
  position: fixed;
  top: 0;
  left: var(--md-sys-sidebar-collapsed, 80px); /* Use CSS variable for sidebar width */
  width: 420px;
  max-width: 90vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: rgb(var(--md-sys-color-surface));
  z-index: 40; /* Higher than nav rail (30) but still allows modals and other overlays */
  box-shadow: var(--md-elevation-level2);
  will-change: transform;
  transform-origin: left center;
  overflow: hidden;
  border-radius: 0 28px 28px 0;
  /* Add visual overlap appearance */
  margin-left: -2px; /* Create overlap with rail to hide rounded corners */
}

.rail-connector {
  position: absolute;
  top: 50%;
  left: -28px; /* Position outside drawer */
  width: 28px;
  height: 56px;
  background-color: rgb(var(--md-sys-color-surface-container-high));
  box-shadow: var(--md-elevation-level1);
  opacity: 0;
  z-index: 5; /* Ensure proper stacking */
  transform: translateY(-50%); /* Center vertically */
  border-radius: 0 28px 28px 0;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(var(--md-sys-color-surface), 0.7);
  z-index: 20;
}

.loading-icon {
  font-size: 48px;
  color: rgb(var(--md-sys-color-primary));
}

.scrollable-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  scroll-behavior: smooth;
  scroll-padding-top: 16px;
  padding: 0 16px 16px;
}

.drawer-accent-line {
  position: absolute;
  top: 24px;
  bottom: 24px;
  left: 0;
  width: 4px;
  background: linear-gradient(to bottom, rgb(var(--md-sys-color-primary)), rgb(var(--md-sys-color-tertiary)));
  opacity: 0.8;
  transform-origin: top center;
  border-radius: 4px;
}

/* Mobile-specific styles */
@media (max-width: 767px) {
  .walk-drawer {
    width: 100%;
    max-width: 100%;
    left: 0;
    border-radius: 0;
  }
}
</style>