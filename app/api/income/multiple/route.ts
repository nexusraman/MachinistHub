import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Income from '@/models/income'
import Client from '@/models/clients'
import { nanoid } from 'nanoid'
import { ok, err } from '@/lib/apiHelper'

export async function POST(req: NextRequest) {
  const incomes = await req.json()

  try {
    await connectDB()
    const saved = []

    for (const data of incomes) {
      const { client: clientName, reason, amount, date, medium, transferMethod, comment } = data
      const paymentId = nanoid()

      const newIncome = new Income({
        paymentId, client: clientName, reason, amount, date, medium,
        transferMethod: medium === 'Transfer' ? transferMethod : undefined,
        comment,
      })

      const client = await Client.findOne({ name: clientName })
      if (client) {
        if (client.calculatedBalance === 0 || client.calculatedBalance === undefined) {
          client.calculatedBalance = client.balance
        }
        client.calculatedBalance -= amount
        client.payments.push({
          date, amount, paymentId,
          transferMethod: medium === 'Online' ? transferMethod : undefined,
          comment: comment || '',
        })
        await client.save({ validateModifiedOnly: true })
      }

      await newIncome.save()
      saved.push(newIncome)
    }

    return ok(saved, 201)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}
