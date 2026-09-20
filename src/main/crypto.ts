import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'
import os from 'node:os'

const ALGORITHM = 'aes-256-gcm'
// Use machine-specific salt and fixed pass for local secret vault
const SALT = 'service-hub-local-vault-salt'
const MASTER_KEY = scryptSync(`${os.hostname()}-${os.userInfo().username}-servicehub`, SALT, 32)

export function encryptText(text: string): string {
  if (!text) return ''
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, MASTER_KEY, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const tag = cipher.getAuthTag().toString('hex')
  return `${iv.toString('hex')}:${tag}:${encrypted}`
}

export function decryptText(encryptedText: string): string {
  if (!encryptedText) return ''
  try {
    const parts = encryptedText.split(':')
    if (parts.length !== 3) return encryptedText // fallback to plain if not encrypted format
    const [ivHex, tagHex, contentHex] = parts
    const iv = Buffer.from(ivHex, 'hex')
    const tag = Buffer.from(tagHex, 'hex')
    const decipher = createDecipheriv(ALGORITHM, MASTER_KEY, iv)
    decipher.setAuthTag(tag)
    let decrypted = decipher.update(contentHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch {
    return encryptedText
  }
}
