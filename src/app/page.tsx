'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useMemos } from '@/hooks/useMemos'
import { Memo, MemoFormData } from '@/types/memo'
import MemoList from '@/components/MemoList'

const MemoForm = dynamic(() => import('@/components/MemoForm'), { ssr: false })
const MemoDetailViewer = dynamic(
  () => import('@/components/MemoDetailViewer'),
  { ssr: false }
)

export default function Home() {
  const {
    memos,
    loading,
    searchQuery,
    selectedCategory,
    stats,
    createMemo,
    updateMemo,
    deleteMemo,
    searchMemos,
    filterByCategory,
  } = useMemos()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingMemo, setEditingMemo] = useState<Memo | null>(null)
  const [selectedMemoForView, setSelectedMemoForView] = useState<Memo | null>(
    null
  )
  const [summaryByMemoId, setSummaryByMemoId] = useState<Record<string, string>>(
    {}
  )
  const [summaryErrorByMemoId, setSummaryErrorByMemoId] = useState<
    Record<string, string>
  >({})
  const [suggestedTagsByMemoId, setSuggestedTagsByMemoId] = useState<
    Record<string, string[]>
  >({})

  const handleCreateMemo = async (formData: MemoFormData) => {
    const created = await createMemo(formData)
    if (created) setIsFormOpen(false)
  }

  const handleUpdateMemo = async (formData: MemoFormData) => {
    if (editingMemo) {
      await updateMemo(editingMemo.id, formData)
      setEditingMemo(null)
      setIsFormOpen(false)
    }
  }

  const handleEditMemo = (memo: Memo) => {
    setEditingMemo(memo)
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingMemo(null)
  }

  const handleViewMemo = (memo: Memo) => {
    setSelectedMemoForView(memo)
  }

  const handleViewerClose = () => {
    setSelectedMemoForView(null)
  }

  const handleViewerEdit = (memo: Memo) => {
    setEditingMemo(memo)
    setIsFormOpen(true)
    setSelectedMemoForView(null)
  }

  const handleViewerDelete = async (id: string) => {
    await deleteMemo(id)
    setSelectedMemoForView(null)
  }

  const handleSummaryLoaded = (memoId: string, summary: string) => {
    setSummaryByMemoId(prev => ({ ...prev, [memoId]: summary }))
    setSummaryErrorByMemoId(prev => ({ ...prev, [memoId]: '' }))
  }

  const handleSummaryError = (memoId: string, message: string) => {
    setSummaryErrorByMemoId(prev => ({ ...prev, [memoId]: message }))
  }

  const handleSuggestedTagsLoaded = (memoId: string, tags: string[]) => {
    setSuggestedTagsByMemoId(prev => ({ ...prev, [memoId]: tags }))
  }

  const handleAddTags = async (memoId: string, tagsToAdd: string[]) => {
    const memo = memos.find(m => m.id === memoId)
    if (!memo || tagsToAdd.length === 0) return
    const merged = [...new Set([...memo.tags, ...tagsToAdd])]
    await updateMemo(memoId, {
      title: memo.title,
      content: memo.content,
      category: memo.category,
      tags: merged,
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-gray-900">📝 메모 앱</h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsFormOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                새 메모
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MemoList
          memos={memos}
          loading={loading}
          searchQuery={searchQuery}
          selectedCategory={selectedCategory}
          onSearchChange={searchMemos}
          onCategoryChange={filterByCategory}
          onEditMemo={handleEditMemo}
          onDeleteMemo={deleteMemo}
          onViewMemo={handleViewMemo}
          stats={stats}
        />
      </main>

      {/* 모달 폼 - 열릴 때만 마운트하여 초기 로드 시 MDEditor 번들 방지 */}
      {isFormOpen && (
        <MemoForm
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          onSubmit={editingMemo ? handleUpdateMemo : handleCreateMemo}
          editingMemo={editingMemo}
        />
      )}

      {/* 메모 상세 뷰어 */}
      {selectedMemoForView && (
        <MemoDetailViewer
          memo={selectedMemoForView}
          isOpen={!!selectedMemoForView}
          onClose={handleViewerClose}
          onEdit={handleViewerEdit}
          onDelete={handleViewerDelete}
          cachedSummary={
            summaryByMemoId[selectedMemoForView.id] ?? null
          }
          cachedSummaryError={
            summaryErrorByMemoId[selectedMemoForView.id] ?? null
          }
          onSummaryLoaded={summary =>
            handleSummaryLoaded(selectedMemoForView.id, summary)
          }
          onSummaryError={message =>
            handleSummaryError(selectedMemoForView.id, message)
          }
          cachedSuggestedTags={
            suggestedTagsByMemoId[selectedMemoForView.id] ?? []
          }
          onSuggestedTagsLoaded={tags =>
            handleSuggestedTagsLoaded(selectedMemoForView.id, tags)
          }
          onAddTags={tags =>
            handleAddTags(selectedMemoForView.id, tags)
          }
        />
      )}
    </div>
  )
}
