'use client'

import React, { useState, useEffect } from 'react'
import axios from 'axios'
import CardComponent from './CardComponent'

interface Props { customDates?: [number, number]; calenderValue?: string }

const ExpenseOverviewCard = (props: Props) => {
  const [income, setIncome] = useState<{ date: string; amount: number }[]>([])
  const [expenses, setExpenses] = useState<{ date: string; amount: number }[]>([])
  const [totalExpense, setTotalExpense] = useState(0)
  const [totalIncome, setTotalIncome] = useState(0)

  useEffect(() => {
    axios.get('/api/expense').then(res => setExpenses(res.data))
    axios.get('/api/income').then(res => setIncome(res.data))
  }, [])

  useEffect(() => {
    setTotalExpense(0); setTotalIncome(0)
    let backwardDate = new Date()
    if (props.calenderValue === 'weekly') backwardDate.setDate(backwardDate.getDate() - 7)
    if (props.calenderValue === 'monthly') backwardDate.setDate(backwardDate.getDate() - 30)

    const filter = (data: typeof income) => {
      if (props.calenderValue === 'daily') return data.filter(d => new Date().toLocaleDateString() === new Date(d.date).toLocaleDateString())
      if (props.calenderValue === 'weekly' || props.calenderValue === 'monthly') return data.filter(d => new Date(d.date).getTime() >= backwardDate.getTime())
      if (props.customDates?.[0] && props.customDates?.[1]) return data.filter(d => new Date(d.date).getTime() >= props.customDates![0] && new Date(d.date).getTime() <= props.customDates![1])
      return data
    }

    setTotalIncome(filter(income).reduce((s, d) => s + d.amount, 0))
    setTotalExpense(filter(expenses).reduce((s, d) => s + d.amount, 0))
  }, [props.calenderValue, expenses, income, props.customDates])

  return (
    <CardComponent
      FirstTitle="Total Income" FirstValue={totalIncome}
      SecondTitle="Total Expense" SecondValue={totalExpense}
      ThirdTitle="Net" ThirdValue={totalIncome - totalExpense}
      accentColor={totalIncome - totalExpense >= 0 ? '#2e7d32' : '#c62828'}
    />
  )
}

export default ExpenseOverviewCard
