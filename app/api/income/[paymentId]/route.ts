import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Income from '@/models/income'
import Clients from '@/models/clients'
import { ok, err } from '@/lib/apiHelper'

export async function DELETE(_req: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params
  try {
    await connectDB()
    const existing = await Income.findOne({ paymentId })
    if (!existing) return err('Payment not found', 404)

    await Income.findOneAndDelete({ paymentId })

    const client = await Clients.findOne({ 'payments.paymentId': paymentId })
    if (client) {
      const payment = client.payments.find((p: { paymentId: string }) => p.paymentId === paymentId)
      if (payment) {
        client.calculatedBalance = (client.calculatedBalance ?? client.balance) + payment.amount
        client.payments = client.payments.filter((p: { paymentId: string }) => p.paymentId !== paymentId)
        await client.save({ validateModifiedOnly: true })
      }
    }

    return ok({ deleted: true })
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params
  const { amount, medium, transferMethod, date, comment } = await req.json()

  try {
    await connectDB()

    const existing = await Income.findOne({ paymentId })
    if (!existing) return err('Payment not found', 404)

    const oldAmount = existing.amount
    const newAmount = amount ?? oldAmount
    const delta = newAmount - oldAmount

    // Update Income document
    await Income.findOneAndUpdate(
      { paymentId },
      { $set: { amount: newAmount, medium, transferMethod: medium === 'Transfer' ? transferMethod : null, date, comment } }
    )

    // Sync embedded payment in the client's payments array
    const client = await Clients.findOne({ 'payments.paymentId': paymentId })
    if (client) {
      const idx = client.payments.findIndex((p: { paymentId: string }) => p.paymentId === paymentId)
      if (idx !== -1) {
        client.payments[idx].amount = newAmount
        client.payments[idx].medium = medium
        client.payments[idx].transferMethod = medium === 'Transfer' ? transferMethod : null
        client.payments[idx].date = date
        client.payments[idx].comment = comment || ''
        // Adjust running balance: if amount went up, client owes less (balance decreases)
        client.calculatedBalance = (client.calculatedBalance ?? client.balance) - delta
        await client.save({ validateModifiedOnly: true })
      }
    }

    return ok({ paymentId, amount: newAmount, medium, transferMethod, date, comment })
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Server error')
  }
}
