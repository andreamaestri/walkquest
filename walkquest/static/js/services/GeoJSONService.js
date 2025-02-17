import { useWalksStore } from '../stores/walks'

class GeoJSONService {
  constructor() {
    this.walkStore = useWalksStore()
  }

  async getRouteGeoJSON(walkId) {
    try {
      // First check if we already have the route data in the store
      const walk = this.walkStore.getWalkById(walkId)
      if (walk?.route) {
        return this.formatGeoJSON(walk.route)
      }

      // TODO: Implement API call to fetch route data
      // const response = await fetch(`/api/walks/${walkId}/route`)
      // const routeData = await response.json()
      // return this.formatGeoJSON(routeData)
    } catch (error) {
      console.error('Error fetching route GeoJSON:', error)
      return null
    }
  }

  formatGeoJSON(routeData) {
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: routeData.map(point => [point.longitude, point.latitude])
      }
    }
  }

  generateThumbnail(geojson) {
    // Using Mapbox Static Images API to generate route thumbnails
    const coordinates = geojson.geometry.coordinates
    const bounds = this.calculateBounds(coordinates)
    const padding = 50 // pixels of padding around the route

    return `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/[${bounds.join(',')}]/${padding}?access_token=${process.env.MAPBOX_TOKEN}`
  }

  calculateBounds(coordinates) {
    const bounds = coordinates.reduce((acc, coord) => {
      return {
        minLng: Math.min(acc.minLng, coord[0]),
        maxLng: Math.max(acc.maxLng, coord[0]),
        minLat: Math.min(acc.minLat, coord[1]),
        maxLat: Math.max(acc.maxLat, coord[1])
      }
    }, {
      minLng: Infinity,
      maxLng: -Infinity,
      minLat: Infinity,
      maxLat: -Infinity
    })

    return [
      bounds.minLng,
      bounds.minLat,
      bounds.maxLng,
      bounds.maxLat
    ]
  }
}

export default GeoJSONService