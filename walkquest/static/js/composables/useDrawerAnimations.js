/**
 * Animation management composable for drawer components
 */
import { ref, nextTick } from 'vue';
import { animate, stagger, inView } from 'motion';

/**
 * Composable for managing drawer animations with proper lifecycle handling
 */
export function useDrawerAnimations() {
  // Animation manager for better lifecycle management
  const animations = {
    instances: new Set(),
    observers: new Set(),

    // Track and register a new animation
    register(animation) {
      if (!animation) return animation;
      this.instances.add(animation);
      return animation;
    },

    // Track and register a new InView observer
    registerObserver(observer) {
      if (!observer) return observer;
      this.observers.add(observer);
      return observer;
    },

    // Cancel all animations and stop observers
    cleanup() {
      // Cancel all animations
      for (const animation of this.instances) {
        try {
          animation.cancel();
        } catch (err) {
          console.warn("Error cancelling animation:", err);
        }
      }
      this.instances.clear();

      // Stop all observers by calling their stop functions
      for (const stop of this.observers) {
        try {
          stop();
        } catch (err) {
          console.warn("Error stopping observer:", err);
        }
      }
      this.observers.clear();
    },
  };

  // Animation configurations
  const animationConfigs = {
    fluid: { duration: 0.5, easing: [0.22, 1, 0.36, 1] },
    standard: { duration: 0.3, easing: "easeOut" },
    exit: { duration: 0.25, easing: "easeIn" },
  };

  // Component state for animations
  const isTransitioning = ref(false);
  const initialAnimationCompleted = ref(false);

  /**
   * Animate drawer entrance with improved layering effect
   */
  async function onEnter(el, onComplete) {
    if (!el) {
      onComplete();
      return;
    }

    console.log("Starting entrance animation");

    // Set initial state - position drawer fully off-screen to the left
    el.style.opacity = "1"; // Keep opacity at 1 for cleaner effect
    el.style.transform = "translateX(-100%)";
    el.style.boxShadow = "none";

    // Force browser to apply initial styles first
    await new Promise((resolve) =>
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      })
    );

    try {
      // Create our animation with refined Material Design motion
      const animation = animate(
        el,
        {
          transform: ["translateX(-100%)", "translateX(0%)"],
          boxShadow: [
            "0px 0px 0px rgba(0,0,0,0)", 
            "var(--md-sys-elevation-2)"
          ]
        },
        {
          duration: 0.4,
          easing: [0.05, 0.7, 0.1, 1.0], // MD3 emphasized decelerate curve
        }
      );

      // Important: Tell Vue we're done AFTER the animation completes
      animation.finished
        .then(() => {
          onComplete();

          // These animations can happen after the transition is "complete"
          const accentLine = el.querySelector(".drawer-accent-line");
          if (accentLine) {
            animate(
              accentLine,
              { scaleY: [0, 1], opacity: [0, 0.8] },
              { 
                duration: 0.5,
                easing: [0.2, 0, 0.2, 1]  
              }
            );
          }
        })
        .catch((error) => {
          console.error("Animation error:", error);
          onComplete();
        });
    } catch (error) {
      console.error("Animation setup error:", error);
      el.style.transform = "translateX(0)";
      onComplete();
    }
  }

  /**
   * Animate drawer exit with improved layering effect
   */
  async function onLeave(el, onComplete) {
    if (!el) {
      onComplete();
      return;
    }

    console.log("Starting exit animation");

    try {
      // First animate out accent line
      const accentLine = el.querySelector(".drawer-accent-line");
      if (accentLine) {
        animate(
          accentLine,
          { scaleY: [1, 0], opacity: [0.8, 0] },
          { 
            duration: 0.2,
            easing: [0.4, 0.0, 1.0, 1.0]
          }
        );
      }

      // Main element animation with proper promise handling
      const animation = animate(
        el,
        {
          transform: ["translateX(0%)", "translateX(-100%)"],
          boxShadow: [
            "var(--md-sys-elevation-2)", 
            "0px 0px 0px rgba(0,0,0,0)"
          ]
        },
        {
          duration: 0.35,
          easing: [0.3, 0.0, 0.8, 0.15], // MD3 emphasized accelerate curve
        }
      );

      // Wait for animation to complete before calling onComplete
      animation.finished
        .then(() => {
          onComplete();
        })
        .catch((error) => {
          console.error("Exit animation error:", error);
          el.style.opacity = "0";
          onComplete();
        });
    } catch (error) {
      console.error("Exit animation setup error:", error);
      el.style.opacity = "0";
      onComplete();
    }
  }

  /**
   * Animate content out when drawer transitions between walks
   */
  async function animateContentOut(drawerRef) {
    // Clean up existing animations
    animations.cleanup();

    if (!drawerRef) return;

    const elements = [
      ...drawerRef.querySelectorAll(".section"),
      ...drawerRef.querySelectorAll(".key-info"),
      ...drawerRef.querySelectorAll(".amenities-grid"),
      ...drawerRef.querySelectorAll(".buttons-container"),
    ];

    if (elements.length) {
      const animation = animations.register(
        animate(
          elements,
          {
            opacity: [1, 0],
            transform: ["translateY(0)", "translateY(30px)"],
          },
          {
            duration: 0.3,
            easing: [0.4, 0.0, 0.2, 1], // Modern easing curve
            delay: stagger(0.03, { from: "last" }),
          }
        )
      );
      await animation.finished;
    }
  }

  /**
   * Animate content in when drawer loads new content
   */
  async function animateContentIn(drawerRef) {
    // Prevent duplicate animations and only run initial animation once
    if (
      !drawerRef ||
      isTransitioning.value ||
      drawerRef.dataset.animatingIn === "true"
    )
      return;

    // Skip if initial animation has already been completed for this instance
    if (initialAnimationCompleted.value && !isTransitioning.value) return;

    try {
      // Mark as animating to prevent duplicate calls
      drawerRef.dataset.animatingIn = "true";

      await nextTick();

      // Animate header elements first
      const headerElements = drawerRef.querySelectorAll(".header-content, .key-info");
      if (headerElements.length) {
        const headerAnimation = animations.register(
          animate(
            headerElements,
            {
              opacity: [0, 1],
              transform: ["translateY(-30px)", "translateY(0)"],
            },
            {
              duration: 0.4,
              easing: [0.0, 0.0, 0.2, 1], // Modern deceleration curve
              delay: stagger(0.1),
            }
          )
        );
      }

      // Then animate content sections
      const sections = drawerRef.querySelectorAll(".section");
      if (sections.length) {
        const animation = animations.register(
          animate(
            sections,
            {
              opacity: [0, 1],
              transform: ["translateY(40px)", "translateY(0)"],
            },
            {
              delay: stagger(0.08, { start: 0.2 }),
              duration: 0.5,
              easing: [0.0, 0.0, 0.2, 1], // Modern deceleration curve
            }
          )
        );

        // Animate highlights with stagger after sections appear
        const highlightItems =
          drawerRef.querySelectorAll(".section-list-item");
        if (highlightItems.length) {
          animations.register(
            animate(
              highlightItems,
              {
                opacity: [0, 1],
                transform: ["translateX(-15px)", "translateX(0)"],
                scale: [0.95, 1],
              },
              {
                delay: stagger(0.06, { start: 0.5 }),
                duration: 0.4,
                easing: [0.0, 0.0, 0.2, 1],
              }
            )
          );
        }
      }

      // Mark initial animation as completed
      initialAnimationCompleted.value = true;
    } finally {
      // Set a timeout to remove the flag after animations should be complete
      setTimeout(() => {
        if (drawerRef) {
          drawerRef.dataset.animatingIn = "false";
        }
      }, 1000);
    }
  }

  /**
   * Set up scroll-based animations for drawer content
   */
  function setupScrollAnimations(drawerRef) {
    if (!drawerRef) return;
    
    const sections = drawerRef.querySelectorAll(".section");
    sections.forEach((section) => {
      // Add data attribute to track animation state
      if (section.dataset.animated === "true") return;

      // Store the stop function returned by inView
      const stop = inView(
        section,
        (info) => {
          // Skip if already animated
          if (section.dataset.animated === "true") return;

          // Mark as animated to prevent repeating
          section.dataset.animated = "true";

          // Animate amenities, chips, etc.
          const elements = section.querySelectorAll(
            ".amenity-item, .poi-chip, .feature-chip, .pub-card, .category-chip"
          );
          if (elements.length) {
            animations.register(
              animate(
                elements,
                {
                  opacity: [0, 1],
                  scale: [0.92, 1],
                  transform: ["translateY(20px)", "translateY(0)"],
                },
                {
                  delay: stagger(0.04),
                  duration: 0.4,
                  easing: [0.0, 0.0, 0.2, 1],
                }
              )
            );
          }

          // Animate highlight list items with horizontal stagger
          const highlightItems =
            section.querySelectorAll(".section-list-item");
          if (highlightItems.length) {
            animations.register(
              animate(
                highlightItems,
                {
                  opacity: [0, 1],
                  transform: ["translateX(-15px)", "translateX(0)"],
                  scale: [0.95, 1],
                },
                {
                  delay: stagger(0.06),
                  duration: 0.45,
                  easing: [0.0, 0.0, 0.2, 1],
                }
              )
            );
          }

          // Stop observing this section
          stop();
        },
        {
          margin: "-5% 0px -10% 0px",
          amount: 0.15,
        }
      );

      // Store the stop function for cleanup
      animations.observers.add(stop);
    });
  }

  /**
   * Toggle details animation (for expandable sections)
   */
  function toggleDetailsAnimation(e) {
    const detail = e.target;
    const content = detail.querySelector(".details-content");
    const isOpen = detail.open;

    if (!content) return;

    if (isOpen) {
      content.style.height = "0px";
      content.style.overflow = "hidden";
      content.style.opacity = "0";
      const targetHeight = content.scrollHeight;

      animate(
        content,
        {
          height: [0, `${targetHeight}px`],
          opacity: [0, 1],
          transform: ["translateY(-20px)", "translateY(0px)"],
        },
        { duration: 0.4, easing: [0.0, 0.0, 0.2, 1] }
      ).finished.then(() => {
        content.style.height = "auto";
        content.style.overflow = "visible";
      });
    } else {
      const currentHeight = content.offsetHeight;
      content.style.height = `${currentHeight}px`;
      content.style.overflow = "hidden";

      animate(
        content,
        {
          height: [`${currentHeight}px`, "0px"],
          opacity: [1, 0],
          transform: ["translateY(0px)", "translateY(-20px)"],
        },
        { duration: 0.35, easing: [0.4, 0.0, 0.2, 1] }
      );
    }
  }

  /**
   * Animate category chip when clicked
   */
  async function animateCategoryClick(category) {
    // Find the category chip element to animate it
    const categoryChips = document.querySelectorAll('.category-chip');
    const targetChip = Array.from(categoryChips).find(chip => 
      chip.querySelector('.category-name')?.textContent === category.name
    );
    
    if (targetChip) {
      // Add bounce animation effect when clicked
      await animate(
        targetChip,
        {
          scale: [1, 1.08, 1],
          backgroundColor: [
            'currentColor',
            'rgb(var(--md-sys-color-primary-container))',
            'currentColor'
          ]
        },
        { duration: 0.4, easing: [0.2, 0.8, 0.2, 1] }
      ).finished;
    }
  }

  return {
    // Animation manager
    animations,
    
    // State
    isTransitioning,
    initialAnimationCompleted,
    
    // Animation configurations
    animationConfigs,
    
    // Animation handlers
    onEnter,
    onLeave,
    animateContentOut,
    animateContentIn,
    setupScrollAnimations,
    toggleDetailsAnimation,
    animateCategoryClick
  };
}