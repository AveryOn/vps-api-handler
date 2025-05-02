import type { Request } from "express"
import * as crypto from 'crypto'

/**
 * Middleware для проверки подписи
 */
export function verifyGitHubSignature(req: Request, signature: string): boolean {
    if (!signature) {
      return false
    }
  
    const [algo, hash] = signature.split('=')
    if (algo !== 'sha256' || !hash) {
      return false
    }
  
    // Считаем HMAC от body
    const hmac = crypto
      .createHmac('sha256', process.env.WEBHOOKS_SECRET)
      .update(req.body as Buffer)
      .digest('hex')
  
    // Защищённое сравнение
    const valid = crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(hmac, 'hex'))
    if (!valid) {
      return false
    }
  
    return true
  }