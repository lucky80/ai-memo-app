'use server'

import { supabase } from '@/lib/supabase/server'
import { Memo, MemoFormData } from '@/types/memo'
import { sampleMemos } from '@/utils/seedData'

type MemoRow = {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  created_at: string
  updated_at: string
}

function toMemo(row: MemoRow): Memo {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    category: row.category,
    tags: row.tags ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toRow(formData: MemoFormData): Omit<MemoRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    title: formData.title,
    content: formData.content,
    category: formData.category,
    tags: formData.tags ?? [],
  }
}

export async function getMemos(): Promise<{ data: Memo[] | null; error: string | null }> {
  try {
    const { data: rows, error } = await supabase
      .from('memos')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      return { data: null, error: error.message }
    }
    return {
      data: (rows ?? []).map((r: MemoRow) => toMemo(r)),
      error: null,
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'getMemos failed'
    return { data: null, error: message }
  }
}

export async function createMemo(
  formData: MemoFormData
): Promise<{ data: Memo | null; error: string | null }> {
  try {
    const { data: row, error } = await supabase
      .from('memos')
      .insert(toRow(formData))
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message }
    }
    return { data: toMemo(row as MemoRow), error: null }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'createMemo failed'
    return { data: null, error: message }
  }
}

export async function updateMemo(
  id: string,
  formData: MemoFormData
): Promise<{ data: Memo | null; error: string | null }> {
  try {
    const { data: row, error } = await supabase
      .from('memos')
      .update(toRow(formData))
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message }
    }
    return { data: row ? toMemo(row as MemoRow) : null, error: null }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'updateMemo failed'
    return { data: null, error: message }
  }
}

export async function deleteMemo(id: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from('memos').delete().eq('id', id)
    return { error: error?.message ?? null }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'deleteMemo failed'
    return { error: message }
  }
}

export async function clearAllMemos(): Promise<{ data: Memo[] | null; error: string | null }> {
  try {
    const { error } = await supabase.from('memos').delete().gte('id', '')
    if (error) {
      return { data: null, error: error.message }
    }
    return { data: [], error: null }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'clearAllMemos failed'
    return { data: null, error: message }
  }
}

export async function seedMemos(): Promise<{ data: Memo[] | null; error: string | null }> {
  try {
    const { data: existing } = await getMemos()
    if (existing && existing.length > 0) {
      return { data: existing, error: null }
    }

    const rows = sampleMemos.map(m => ({
      id: m.id,
      title: m.title,
      content: m.content,
      category: m.category,
      tags: m.tags,
      created_at: m.createdAt,
      updated_at: m.updatedAt,
    }))

    const { data: inserted, error } = await supabase.from('memos').insert(rows).select()

    if (error) {
      return { data: null, error: error.message }
    }
    return {
      data: (inserted ?? []).map((r: MemoRow) => toMemo(r)),
      error: null,
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'seedMemos failed'
    return { data: null, error: message }
  }
}
