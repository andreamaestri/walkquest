import { ref } from 'vue'

export function useDateTimeUtils() {
  // Current month and year for calendar navigation
  const currentMonth = ref(new Date().getMonth())
  const currentYear = ref(new Date().getFullYear())

  /**
   * Format a date string (YYYY-MM-DD) for display
   */
  function formatDateForDisplay(dateString) {
    if (!dateString || typeof dateString !== 'string') return ''
    
    // Handle Date object input
    if (dateString instanceof Date) {
      return new Intl.DateTimeFormat('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric',
        year: 'numeric' 
      }).format(dateString)
    }
    
    const [year, month, day] = dateString.split('-').map(Number)
    if (!year || !month || !day) return ''
    
    const date = new Date(year, month - 1, day)
    if (isNaN(date.getTime())) return ''
    
    return new Intl.DateTimeFormat('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric' 
    }).format(date)
  }

  /**
   * Format a time string (HH:MM) for display
   */
  function formatTimeForDisplay(timeString) {
    if (!timeString) return ''
    
    const [hourStr, minuteStr] = timeString.split(':')
    const hour = parseInt(hourStr, 10)
    const minute = parseInt(minuteStr, 10)
    
    const period = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    
    return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`
  }

  /**
   * Get days for the current month/year
   */
  function getDaysInMonth() {
    const daysInMonth = new Date(currentYear.value, currentMonth.value + 1, 0).getDate()
    const firstDayOfMonth = new Date(currentYear.value, currentMonth.value, 1).getDay()
    
    const days = []
    
    // Add empty slots for days before the first of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({ day: null, isCurrentMonth: false })
    }
    
    // Add days of the current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ 
        day: i, 
        isCurrentMonth: true,
        isToday: isToday(i),
        date: formatDateString(i)
      })
    }
    
    return days
  }

  /**
   * Check if a day is today
   */
  function isToday(day) {
    const today = new Date()
    return day === today.getDate() && 
           currentMonth.value === today.getMonth() && 
           currentYear.value === today.getFullYear()
  }

  /**
   * Format a date as YYYY-MM-DD
   */
  function formatDateString(day) {
    const month = currentMonth.value + 1
    return `${currentYear.value}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
  }

  /**
   * Get month name
   */
  function getMonthName() {
    return new Date(currentYear.value, currentMonth.value).toLocaleString('default', { month: 'long' })
  }

  /**
   * Navigate to previous month
   */
  function setToPreviousMonth() {
    if (currentMonth.value === 0) {
      currentMonth.value = 11
      currentYear.value--
    } else {
      currentMonth.value--
    }
  }

  /**
   * Navigate to next month
   */
  function setToNextMonth() {
    if (currentMonth.value === 11) {
      currentMonth.value = 0
      currentYear.value++
    } else {
      currentMonth.value++
    }
  }

  /**
   * Get the day names for the calendar header
   */
  function getDayNames() {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  }

  /**
   * Check if a date string is a valid date
   */
  function isValidDate(dateString) {
    if (!dateString) return false
    
    const regex = /^\d{4}-\d{2}-\d{2}$/
    if (!regex.test(dateString)) return false
    
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    
    return date instanceof Date && !isNaN(date) &&
           date.getFullYear() === year &&
           date.getMonth() === month - 1 &&
           date.getDate() === day
  }

  /**
   * Get the current month label (e.g. "March 2024")
   */
  function getCurrentMonthLabel() {
    return `${getMonthName()} ${currentYear.value}`
  }

  return {
    currentMonth,
    currentYear,
    formatDateForDisplay,
    formatTimeForDisplay,
    getDaysInMonth,
    getMonthName,
    getDayNames,
    setToPreviousMonth,
    setToNextMonth,
    isValidDate,
    getCurrentMonthLabel
  }
}