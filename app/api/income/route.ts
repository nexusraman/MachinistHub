import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Income from '@/models/income'
import Expense from '@/models/expense'
import Client from '@/models/clients'
import { nanoid } from 'nanoid'
import { ok, err } from '@/lib/apiHelper'

export async function GET() {
  try {
    await connectDB()
    const incomes = await Income.find().sort({ date: -1 })
    return ok(incomes)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}

export async function POST(req: NextRequest) {
  const { client: clientName, reason, amount, date, medium, transferMethod, comment, linkedExpense } = await req.json()
  const paymentId = nanoid()

  try {
    await connectDB()

    let linkedExpenseId: string | null = null

    if (linkedExpense) {
      const expenseId = nanoid()
      const newExpense = new Expense({
        expenseId,
        payee: linkedExpense.payee,
        reason: linkedExpense.reason,
        amount: linkedExpense.amount,
        date,
        medium: linkedExpense.medium,
        transferMethod: linkedExpense.medium === 'Transfer' ? linkedExpense.transferMethod : undefined,
        comment: linkedExpense.comment || '',
      })
      await newExpense.save()
      linkedExpenseId = newExpense._id.toString()
      await Expense.findByIdAndUpdate(newExpense._id, { linkedIncomeId: paymentId })
    }

    const newIncome = new Income({
      paymentId, client: clientName, reason, amount, date, medium,
      transferMethod: medium === 'Transfer' ? transferMethod : undefined,
      comment,
      linkedExpenseId,
    })

    const client = await Client.findOne({ name: clientName })
    if (!client) return err('Client not found', 404)

    if (client.calculatedBalance === 0 || client.calculatedBalance === undefined) {
      client.calculatedBalance = client.balance
    }
    client.calculatedBalance -= amount
    client.payments.push({
      date, amount, paymentId, medium,
      transferMethod: medium === 'Transfer' ? transferMethod : undefined,
      comment: comment || '',
    })

    await client.save({ validateModifiedOnly: true })
    await newIncome.save()
    return ok(newIncome, 201)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}
