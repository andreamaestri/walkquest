export const MD3_EASING = {
    standard: [0.2, 0.0, 0, 1.0],
    standardAccelerate: [0.3, 0.0, 1.0, 1.0],
    standardDecelerate: [0.0, 0.0, 0.2, 1.0],
    emphasized: [0.2, 0.0, 0, 1.0], // Corrected to standard curve as emphasized is different
    emphasizedAccelerate: [0.3, 0.0, 0.8, 0.15],
    emphasizedDecelerate: [0.05, 0.7, 0.1, 1.0],
    // Add in new curves from MD3
    fastOutSlowIn: [0.25, 0.46, 0.45, 0.94],
    linearOutSlowIn: [0.0, 0.0, 0.2, 1.0],
    fastOutLinearIn: [0.3, 0.0, 1.0, 0.0],
    // Add in cubic bezier function for custom values
    cubicBezier: (p1x, p1y, p2x, p2y) => `cubic-bezier(${p1x}, ${p1y}, ${p2x}, ${p2y})`
  }
  
  export const MD3_DURATION = {
    short1: 100,
    short2: 150, // Corrected value
    short3: 200, // Corrected value
    short4: 250, // Corrected value
    medium1: 300, // Corrected value
    medium2: 350, // Corrected value
    medium3: 400, // Corrected value
    medium4: 450, // Corrected value
    long1: 500, // Corrected value
    long2: 550, // Corrected value
    long3: 600, // Corrected value
    long4: 700, // Corrected value
    extraLong1: 800, // Corrected value
    extraLong2: 900, // Corrected value
    // Add extraLong3 and extraLong4 as per MD3 spec
    extraLong3: 1000,
    extraLong4: 1200
  }
  
  export const createMotion = (options = {}) => ({
    duration: options.duration || MD3_DURATION.medium4, // Corrected default to medium4
    easing: options.easing || MD3_EASING.emphasized,
    ...options
  })