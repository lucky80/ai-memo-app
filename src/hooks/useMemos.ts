'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Memo, MemoFormData } from '@/types/memo'
import {
  createMemo as createMemoAction,
  updateMemo as updateMemoAction,
  deleteMemo as deleteMemoAction,
  seedMemos,
  clearAllMemos as clearAllMemosAction,
} from '@/app/actions/memos'

export const useMemos = () => {
  const [memos, setMemos] = useState<Memo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // 메모 로드: 시딩(0건일 때) 후 목록 반영
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    seedMemos()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('Failed to load memos:', error)
          return
        }
        setMemos(data ?? [])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const createMemo = useCallback(async (formData: MemoFormData): Promise<Memo | null> => {
    const { data, error } = await createMemoAction(formData)
    if (error || !data) return null
    setMemos(prev => [data, ...prev])
    return data
  }, [])

  const updateMemo = useCallback(
    async (id: string, formData: MemoFormData): Promise<void> => {
      const { data, error } = await updateMemoAction(id, formData)
      if (error || !data) return
      setMemos(prev => prev.map(m => (m.id === id ? data : m)))
    },
    []
  )

  const deleteMemo = useCallback(async (id: string): Promise<void> => {
    const { error } = await deleteMemoAction(id)
    if (error) return
    setMemos(prev => prev.filter(m => m.id !== id))
  }, [])

  const searchMemos = useCallback((query: string): void => {
    setSearchQuery(query)
  }, [])

  const filterByCategory = useCallback((category: string): void => {
    setSelectedCategory(category)
  }, [])

  const getMemoById = useCallback(
    (id: string): Memo | undefined => {
      return memos.find(memo => memo.id === id)
    },
    [memos]
  )

  const filteredMemos = useMemo(() => {
    let filtered = memos
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(memo => memo.category === selectedCategory)
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        memo =>
          memo.title.toLowerCase().includes(query) ||
          memo.content.toLowerCase().includes(query) ||
          memo.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }
    return filtered
  }, [memos, selectedCategory, searchQuery])

  const clearAllMemos = useCallback(async (): Promise<void> => {
    const { error } = await clearAllMemosAction()
    if (error) return
    setMemos([])
    setSearchQuery('')
    setSelectedCategory('all')
  }, [])

  const stats = useMemo(() => {
    const totalMemos = memos.length
    const categoryCounts = memos.reduce(
      (acc, memo) => {
        acc[memo.category] = (acc[memo.category] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )
    return {
      total: totalMemos,
      byCategory: categoryCounts,
      filtered: filteredMemos.length,
    }
  }, [memos, filteredMemos])

  return {
    memos: filteredMemos,
    allMemos: memos,
    loading,
    searchQuery,
    selectedCategory,
    stats,
    createMemo,
    updateMemo,
    deleteMemo,
    getMemoById,
    searchMemos,
    filterByCategory,
    clearAllMemos,
  }
}
