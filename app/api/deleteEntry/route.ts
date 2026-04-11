import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Expense from '@/models/expense'
import Income from '@/models/income'
import Client from '@/models/clients'
import { ok, err } from '@/lib/apiHelper'

export async function POST(req: NextRequest) {
  const { _id, category } = await req.json()

  if (!['expense', 'income'].includes(category)) {
    return err('Invalid type. Must be "expense" or "income".', 400)
  }

  try {
    await connectDB()

    if (category === 'expense') {
      await Expense.deleteOne({ _id })
      return ok({ message: 'Expense Deleted' })
    }

    const income = await Income.findById(_id)
    if (!income) return err('Income not found', 404)

    const { client: clientName, paymentId, amount } = income
    if (!paymentId) return err('Income record missing paymentId.', 400)

    const client = await Client.findOne({ name: clientName })
    if (client) {
      client.payments = client.payments.filter((p: { paymentId: string }) => p.paymentId !== paymentId)
      client.calculatedBalance = (client.calculatedBalance || 0) + parseInt(amount)
      await client.save({ validateModifiedOnly: true })
    }

    await Income.deleteOne({ _id })
    return ok({ message: 'Income Deleted and client balance updated' })
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}
