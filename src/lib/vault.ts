import { supabase } from './supabase'
import type { CipherPayload } from './crypto'

export interface Entry {
  id: string
  site: string
  username: string
  password: string
  notes: string
  createdAt: string
  updatedAt: string
}

export interface VaultData {
  entries: Entry[]
}

export interface VaultRow {
  user_id: string
  salt: string
  verifier: string
  verifier_iv: string
  data: string | null
  data_iv: string | null
  version: number
  updated_at: string
}

export class VaultConflictError extends Error {
  constructor() {
    super('This vault was changed on another device.')
    this.name = 'VaultConflictError'
  }
}

const TABLE = 'vaults'

function dbError(message: string): Error {
  if (/relation .*vaults.* does not exist/i.test(message)) {
    return new Error(
      'The database table is missing. Run supabase/schema.sql in your Supabase project.',
    )
  }
  if (/permission denied|row-level security/i.test(message)) {
    return new Error('Database access denied. Check the RLS policies in supabase/schema.sql.')
  }
  return new Error(message)
}

export async function fetchVault(userId: string): Promise<VaultRow | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw dbError(error.message)
  return (data as VaultRow | null) ?? null
}

export async function createVault(
  userId: string,
  salt: string,
  verifier: CipherPayload,
  data: CipherPayload,
): Promise<VaultRow> {
  const { data: row, error } = await supabase
    .from(TABLE)
    .insert({
      user_id: userId,
      salt,
      verifier: verifier.data,
      verifier_iv: verifier.iv,
      data: data.data,
      data_iv: data.iv,
    })
    .select('*')
    .single()

  if (error) throw dbError(error.message)
  return row as VaultRow
}

interface VaultPatch {
  salt?: string
  verifier?: CipherPayload
  data?: CipherPayload
}

/**
 * Optimistic-concurrency update: the row only changes if nobody else bumped
 * the version in the meantime.
 */
export async function updateVault(
  userId: string,
  expectedVersion: number,
  patch: VaultPatch,
): Promise<VaultRow> {
  const changes: Record<string, unknown> = {
    version: expectedVersion + 1,
    updated_at: new Date().toISOString(),
  }
  if (patch.salt) changes.salt = patch.salt
  if (patch.verifier) {
    changes.verifier = patch.verifier.data
    changes.verifier_iv = patch.verifier.iv
  }
  if (patch.data) {
    changes.data = patch.data.data
    changes.data_iv = patch.data.iv
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update(changes)
    .eq('user_id', userId)
    .eq('version', expectedVersion)
    .select('*')

  if (error) throw dbError(error.message)
  if (!data || data.length === 0) throw new VaultConflictError()
  return data[0] as VaultRow
}

export async function deleteVault(userId: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('user_id', userId)
  if (error) throw dbError(error.message)
}
