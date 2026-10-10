import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

// Must match the secret used in models/User.ts getSignedToken()
const JWT_SECRET = 'werollin'

export function getUserId(req: NextRequest): string | null {
  const token = req.cookies.get('authToken')?.value
  if (!token) return null
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string }
    return decoded.id
  } catch {
    return null
  }
}
