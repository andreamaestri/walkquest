<template>
  <div class="walk-list">
    <div v-if="error" class="message message-error">{{ error }}</div>
    <div v-if="isLoading" class="loading-spinner"></div>
    <ul v-else>
      <li v-for="walk in walksStore.walks" :key="walk.id">
        {{ walk.walk_name }}
      </li>
    </ul>
    <button v-if="hasMore" @click="loadMore" :disabled="isLoadingMore">
      Load More
    </button>
    <div v-if="isLoadingMore" class="loading-spinner"></div>
  </div>
</template>

<script>
import { useWalksStore } from '../stores/walks'
import { ref, computed, onMounted } from 'vue'

export default {
  name: 'WalkList',
  setup() {
    const walksStore = useWalksStore()
    const isLoadingMore = ref(false)
    const hasMore = ref(true)
    const page = ref(1)
    const error = ref(null)

    const loadMore = async () => {
      if (isLoadingMore.value || !hasMore.value) return

      try {
        isLoadingMore.value = true
        const nextPage = page.value + 1

        // const response = await window.ApiService.filterWalks({
        //   search: walksStore.filters.search,
        //   page: nextPage,
        //   page_size: 10
        // })

        // const newWalks = response.walks || []
        // walksStore.walks.push(...newWalks)
        // hasMore.value = newWalks.length >= 10
        // page.value = nextPage
        console.log('Loading more walks')
      } catch (error) {
        console.error('Error loading more walks:', error)
        error.value = 'Failed to load more walks'
      } finally {
        isLoadingMore.value = false
      }
    }

    onMounted(() => {
      // Initialize data from DOM
      // const walksData = document.getElementById('walks-data')
      // if (walksData) {
      //   const initialData = JSON.parse(walksData.textContent)
      //   walksStore.walks = Array.isArray(initialData) ? initialData : (initialData.walks || [])
      //   hasMore.value = walksStore.walks.length >= 10
      // }

      // walksStore.fetchWalks()
      console.log('WalkList mounted')
    })

    return {
      walksStore,
      isLoadingMore,
      hasMore,
      loadMore,
      error
    }
  }
}
</script>

<style scoped>
/* Component styles here */
</style>