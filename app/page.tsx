'use client'

import { useEffect, useState } from 'react'
import Dashboard from '@/components/Dashboard'
import LandingPage from '@/components/LandingPage'

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    setIsAuthenticated(!!token)
  }, [])

  if (isAuthenticated === null) return null

  return isAuthenticated ? <Dashboard /> : <LandingPage />
}
