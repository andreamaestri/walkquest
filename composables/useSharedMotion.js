export const cardMotion = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.95
  },
  enter: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 250,
      damping: 25,
      mass: 0.5
    }
  },
  visible: {
    scale: 1,
    y: 0
  },
  hovered: {
    scale: 1.02,
    y: -4,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 15
    }
  },
  pressed: {
    scale: 0.98
  }
}
