'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import axios from 'axios'
import SubmersibleClient from './SubmersibleClient'
import FanClient from './FanClient'
import Navbar from '../Navbar'

const Client = () => {
  const { id } = useParams<{ id: string }>()
  const [client, setClient] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    axios.get(`/api/client/${id}`)
      .then(res => setClient(res.data))
      .catch(() => setError('Failed to load client data.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <><Navbar /><p style={{ padding: 20 }}>Loading...</p></>
  if (error || !client) return <><Navbar /><p style={{ padding: 20 }}>{error || 'Client not found'}</p></>

  if (client.category === 'fan') return <><Navbar /><FanClient client={client as unknown as Parameters<typeof FanClient>[0]['client']} /></>
  if (client.category === 'submersible') return <><Navbar /><SubmersibleClient client={client as unknown as Parameters<typeof SubmersibleClient>[0]['client']} /></>
  return <><Navbar /><p style={{ padding: 20 }}>Unsupported client category</p></>
}

export default Client
