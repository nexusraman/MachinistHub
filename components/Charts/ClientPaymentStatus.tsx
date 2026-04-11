'use client'

import React, { useState, useEffect } from 'react'
import { Bar } from 'react-chartjs-2'
import axios from 'axios'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const ClientPaymentStatus = () => {
  const [chartData, setChartData] = useState<{ data: object; options: object } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchClientBalance = async () => {
      try {
        setLoading(true)
        const response = await axios.get('/api/client')
        const clients = response.data

        if (!clients || clients.length === 0) {
          throw new Error('No clients found in database.')
        }

        const clientNames = clients.map((c: { name: string }) => c.name || 'Unknown')
        const balances = clients.map((c: { balance: number }) => c.balance || 0)

        const backgroundColors = balances.map((b: number) =>
          b > 0 ? 'rgba(255, 99, 132, 0.8)' : 'rgba(75, 192, 75, 0.8)'
        )
        const borderColors = balances.map((b: number) =>
          b > 0 ? 'rgba(255, 0, 0, 1)' : 'rgba(0, 128, 0, 1)'
        )

        const data = {
          labels: clientNames,
          datasets: [{ label: 'Amount Owed / Paid', data: balances, backgroundColor: backgroundColors, borderColor: borderColors, borderWidth: 2 }],
        }

        const options = {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y' as const,
          plugins: {
            legend: { position: 'top' as const },
            title: { display: true, text: 'Client Payment Status', font: { size: 18, weight: 'bold' as const } },
            tooltip: {
              callbacks: {
                label: (ctx: { parsed: { x: number } }) => {
                  const v = ctx.parsed.x
                  return v > 0 ? `Owes: ₹${v.toFixed(2)}` : `Paid Up: ₹${Math.abs(v).toFixed(2)}`
                },
              },
            },
          },
          scales: {
            x: { beginAtZero: true, ticks: { callback: (v: unknown) => '₹' + v } },
            y: { grid: { display: false } },
          },
        }

        setChartData({ data, options })
        setError(null)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to fetch client data')
      } finally {
        setLoading(false)
      }
    }

    fetchClientBalance()
  }, [])

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>Loading client payment data...</div>
  if (error) return <div style={{ padding: 40, background: '#ffebee', borderRadius: 8, border: '2px solid #f44336' }}><h3 style={{ color: '#c62828' }}>⚠️ Error Loading Dashboard</h3><p>{error}</p></div>

  return (
    <div style={{ width: '100%', height: 600, padding: 20 }}>
      {chartData && <Bar data={chartData.data as Parameters<typeof Bar>[0]['data']} options={chartData.options as Parameters<typeof Bar>[0]['options']} />}
    </div>
  )
}

export default ClientPaymentStatus
