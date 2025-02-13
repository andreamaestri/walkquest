import { animate } from 'motion'

export function useCardTransitions() {
  const springConfig = {
    duration: 0.6,
    easing: [.23, 1, .32, 1]
  }

  const animateCardIn = async (el, index, immediate = false) => {
    return animate(el, 
      { 
        opacity: [0, 1], 
        y: [30, 0],
        scale: [0.9, 1],
        filter: ['blur(4px)', 'blur(0px)']
      }, 
      { 
        ...springConfig,
        delay: immediate ? 0 : index * 0.05
      }
    )
  }

  const animateCardOut = async (el) => {
    const rect = el.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const direction = rect.top > viewportHeight / 2 ? 1 : -1

    return animate(el, 
      { 
        opacity: [1, 0],
        y: [0, 30 * direction],
        scale: [1, 0.9],
        filter: ['blur(0px)', 'blur(4px)']
      },
      springConfig
    )
  }

  const animateCardHover = (el, isHovered) => {
    return animate(el,
      {
        scale: isHovered ? 1.02 : 1,
        y: isHovered ? -8 : 0,
        boxShadow: isHovered 
          ? '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
          : '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06)'
      },
      {
        duration: 0.2,
        easing: 'ease-out'
      }
    )
  }

  return {
    animateCardIn,
    animateCardOut,
    animateCardHover
  }
}