'use client'

import { useEffect, useState } from 'react'
import Dashboard from '@/components/Dashboard'
import LandingPage from '@/components/LandingPage'

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    if (!token) {
      setIsAuthenticated(false)
      return
    }

    // Verify the session cookie is still valid by probing a protected route.
    // If the proxy redirects us (no cookie), clear the stale localStorage token.
    fetch('/clients', { method: 'HEAD', redirect: 'manual' }).then(res => {
      if (res.type === 'opaqueredirect' || res.status === 307 || res.status === 302) {
        localStorage.removeItem('authToken')
        setIsAuthenticated(false)
      } else {
        setIsAuthenticated(true)
      }
    }).catch(() => {
      setIsAuthenticated(true)
    })
  }, [])

  if (isAuthenticated === null) return null

  return isAuthenticated ? <Dashboard /> : <LandingPage />
}
