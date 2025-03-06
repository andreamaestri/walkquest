import { onMounted, onUnmounted } from 'vue'

export function usePortal() {
  let portalRoot

  onMounted(() => {
    portalRoot = document.getElementById('portal-root')
    if (!portalRoot) {
      portalRoot = document.createElement('div')
      portalRoot.id = 'portal-root'
      document.body.appendChild(portalRoot)
    }
  })

  onUnmounted(() => {
    if (portalRoot && !portalRoot.children.length) {
      portalRoot.remove()
    }
  })

  return {
    portalRoot: () => portalRoot
  }
}
