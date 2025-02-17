export function useViewTransition() {
  const pageTransition = {
    onEnter: (el, done) => {
      if (!document.startViewTransition) {
        done()
        return
      }
      
      document.startViewTransition(() => {
        el.style.viewTransitionName = 'page'
        done()
      })
    },
    onLeave: (el, done) => {
      // View Transitions API handles the leaving animation automatically
      done()
    }
  }

  return {
    pageTransition
  }
}