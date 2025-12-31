import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * 路由预加载 Hook
 * 在页面加载完成后，后台预加载其他页面的 JS/CSS 资源
 * 不会发送 API 请求，只加载页面组件
 * @param currentPath 当前页面路径（可选），如果提供则会智能预加载相关动态路由
 */
export function useRoutePrefetch(currentPath?: string) {
  const router = useRouter()

  useEffect(() => {
    console.log('[START] 路由预加载 Hook 已挂载，开始预加载...')

    // 使用 requestIdleCallback 在浏览器空闲时预加载，不影响当前页面渲染
    const prefetchRoutes = () => {
      const routes = [
        // 仪表盘
        '/dashboard/',
        // 组织
        '/organization/',
        // 目标
        '/target/',
        // 漏洞
        '/vulnerabilities/',
        // 扫描
        '/scan/history/',
        '/scan/scheduled/',
        '/scan/engine/',
        // 工具
        '/tools/',
        '/tools/config/',
        '/tools/config/opensource/',
        '/tools/config/custom/',
        '/tools/nuclei/',
        '/tools/wordlists/',
        // 指纹管理
        '/tools/fingerprints/',
        '/tools/fingerprints/ehole/',
        '/tools/fingerprints/goby/',
        '/tools/fingerprints/wappalyzer/',
        '/tools/fingerprints/fingers/',
        '/tools/fingerprints/fingerprinthub/',
        '/tools/fingerprints/arl/',
        // 设置
        '/settings/workers/',
        '/settings/notifications/',
        '/settings/system-logs/',
      ]

      routes.forEach((route) => {
        console.log(`  -> 预加载: ${route}`)
        router.prefetch(route)
      })

      // 如果提供了当前路径，智能预加载相关动态路由
      if (currentPath) {
        // 如果是目标详情页（如 /target/146），预加载子路由
        const targetIdMatch = currentPath.match(/\/target\/(\d+)$/)
        if (targetIdMatch) {
          const targetId = targetIdMatch[1]
          const subRoutes = ['subdomain', 'endpoints', 'websites', 'vulnerabilities', 'directories', 'ip-addresses']
          subRoutes.forEach(sub => {
            router.prefetch(`/target/${targetId}/${sub}`)
          })
          console.log(`  -> 智能预加载目标子路由: /target/${targetId}/*`)
        }
        
        // 如果是扫描历史详情页（如 /scan/history/146），预加载子路由
        const scanIdMatch = currentPath.match(/\/scan\/history\/(\d+)$/)
        if (scanIdMatch) {
          const scanId = scanIdMatch[1]
          const subRoutes = ['subdomain', 'endpoints', 'websites', 'vulnerabilities', 'directories', 'ip-addresses']
          subRoutes.forEach(sub => {
            router.prefetch(`/scan/history/${scanId}/${sub}`)
          })
          console.log(`  -> 智能预加载扫描子路由: /scan/history/${scanId}/*`)
        }
      }

      console.log('[DONE] 所有路由预加载请求已发送')
    }

    // 使用 requestIdleCallback 在浏览器空闲时执行，如果不支持则立即执行
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(prefetchRoutes)
      return () => window.cancelIdleCallback(idleId)
    } else {
      prefetchRoutes()
      return
    }
  }, [router, currentPath])
}

/**
 * 智能路由预加载 Hook
 * 根据当前路径，预加载用户可能访问的下一个页面
 * @param currentPath 当前页面路径
 */
export function useSmartRoutePrefetch(currentPath: string) {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPath.includes('/organization')) {
        // 在组织页面，预加载目标页面
        router.prefetch('/target/')
      } else if (currentPath.includes('/target')) {
        // 在目标页面，预加载扫描和漏洞页面
        router.prefetch('/scan/history/')
        router.prefetch('/vulnerabilities/')

        // 如果是目标详情页（如 /target/146），预加载子路由
        const targetIdMatch = currentPath.match(/\/target\/(\d+)$/)
        if (targetIdMatch) {
          const targetId = targetIdMatch[1]
          const subRoutes = ['subdomain', 'endpoints', 'websites', 'vulnerabilities']
          subRoutes.forEach(sub => {
            router.prefetch(`/target/${targetId}/${sub}`)
          })
          console.log(`  -> 预加载目标子路由: /target/${targetId}/*`)
        }
      } else if (currentPath.includes('/scan/history')) {
        // 在扫描历史页面，预加载目标页面
        router.prefetch('/target/')
        router.prefetch('/vulnerabilities/')
      } else if (currentPath === '/') {
        // 在首页，预加载主要页面
        router.prefetch('/dashboard/')
        router.prefetch('/organization/')
      }
    }, 1500) // 1.5 秒后预加载

    return () => clearTimeout(timer)
  }, [currentPath, router])
}
