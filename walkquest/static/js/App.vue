<template>
  <router-view :mapbox-token="mapboxToken"></router-view>
</template>

<script setup>
const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN
</script>