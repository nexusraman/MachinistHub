'use client'

import React, { useState, useEffect } from 'react'
import axios from 'axios'
import CardComponent from './CardComponent'

interface Props { customDates?: [number, number]; calenderValue?: string }

const ActivitiesOverviewCard = (props: Props) => {
  const [fan, setFan] = useState<{ date: string; quantity: number }[]>([])
  const [submersible, setSubmersible] = useState<{ date: string; quantity: number }[]>([])
  const [totalSubmersible, setTotalSubmersible] = useState(0)
  const [totalFan, setTotalFan] = useState(0)

  useEffect(() => {
    axios.get('/api/fan').then(res => setFan(res.data))
    axios.get('/api/submersible').then(res => setSubmersible(res.data))
  }, [])

  useEffect(() => {
    setTotalSubmersible(0); setTotalFan(0)
    let backwardDate = new Date()
    if (props.calenderValue === 'weekly') backwardDate.setDate(backwardDate.getDate() - 7)
    if (props.calenderValue === 'monthly') backwardDate.setDate(backwardDate.getDate() - 30)

    const filter = (data: typeof fan) => {
      if (props.calenderValue === 'daily') return data.filter(d => new Date().toLocaleDateString() === new Date(d.date).toLocaleDateString())
      if (props.calenderValue === 'weekly' || props.calenderValue === 'monthly') return data.filter(d => new Date(d.date).getTime() >= backwardDate.getTime())
      if (props.customDates?.[0] && props.customDates?.[1]) return data.filter(d => new Date(d.date).getTime() >= props.customDates![0] && new Date(d.date).getTime() <= props.customDates![1])
      return data
    }

    setTotalFan(filter(fan).reduce((s, d) => s + d.quantity, 0))
    setTotalSubmersible(filter(submersible).reduce((s, d) => s + d.quantity, 0))
  }, [props.calenderValue, fan, submersible, props.customDates])

  return (
    <CardComponent
      FirstTitle="Submersible Units" FirstValue={totalSubmersible}
      SecondTitle="Fan Units" SecondValue={totalFan}
      accentColor="#0288d1"
    />
  )
}

export default ActivitiesOverviewCard
