import { ref, computed } from 'vue'

export function useDateTimeUtils() {
  const currentDate = ref(new Date())
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  const currentMonthLabel = computed(() => {
    return currentDate.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  })

  function isToday(date) {
    const today = new Date()
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear()
  }

  const calendarDays = computed(() => {
    const year = currentDate.value.getFullYear()
    const month = currentDate.value.getMonth()
    
    // Create a date for the first day of the current month
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    // Get the day of the week for the first day (0 = Sunday, 6 = Saturday)
    const firstDayOfWeek = firstDay.getDay()
    
    // Calculate days from previous month to show
    const daysFromPrevMonth = firstDayOfWeek
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    
    // Days array to populate the calendar
    const days = []
    
    // Add days from previous month
    for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i
      const date = new Date(year, month - 1, day)
      days.push({
        day,
        iso: date.toISOString().split('T')[0],
        currentMonth: false,
        isToday: isToday(date)
      })
    }
    
    // Add days from current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day)
      days.push({
        day,
        iso: date.toISOString().split('T')[0],
        currentMonth: true,
        isToday: isToday(date)
      })
    }
    
    // Add days from next month to fill the remaining spaces
    const totalDays = 42 // 6 rows of 7 days
    const remainingDays = totalDays - days.length
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day)
      days.push({
        day,
        iso: date.toISOString().split('T')[0],
        currentMonth: false,
        isToday: isToday(date)
      })
    }
    
    return days
  })

  function formatDateForDisplay(isoDate) {
    if (!isoDate) return ''
    return new Date(isoDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  function formatTimeForDisplay(timeString) {
    if (!timeString) return ''
    
    // Parse HH:MM
    const [hours, minutes] = timeString.split(':').map(num => parseInt(num, 10))
    
    // Convert to 12-hour format
    const period = hours >= 12 ? 'PM' : 'AM'
    const hours12 = hours % 12 || 12 // Convert 0 to 12
    
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  function setToNextMonth() {
    const newDate = new Date(currentDate.value)
    newDate.setMonth(newDate.getMonth() + 1)
    currentDate.value = newDate
  }

  function setToPreviousMonth() {
    const newDate = new Date(currentDate.value)
    newDate.setMonth(newDate.getMonth() - 1)
    currentDate.value = newDate
  }

  function getToday() {
    const date = new Date()
    return date.toISOString().split('T')[0]
  }

  return {
    currentDate,
    weekDays,
    currentMonthLabel,
    calendarDays,
    isToday,
    formatDateForDisplay,
    formatTimeForDisplay,
    setToNextMonth,
    setToPreviousMonth,
    getToday
  }
}