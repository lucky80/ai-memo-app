'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Memo, MEMO_CATEGORIES } from '@/types/memo'
import '@uiw/react-markdown-preview/markdown.css'

const MDMarkdown = dynamic(
  () =>
    import('@uiw/react-md-editor').then(mod => ({
      default: mod.default.Markdown,
    })),
  { ssr: false }
)

interface MemoDetailViewerProps {
  memo: Memo
  isOpen: boolean
  onClose: () => void
  onEdit: (memo: Memo) => void
  onDelete: (id: string) => void
  /** 캐시된 요약(모달 재진입 시 유지) */
  cachedSummary?: string | null
  /** 캐시된 요약 에러 메시지 */
  cachedSummaryError?: string | null
  /** 캐시된 추천 태그(요약 시 함께 반환) */
  cachedSuggestedTags?: string[]
  onSummaryLoaded?: (summary: string) => void
  onSummaryError?: (message: string) => void
  onSuggestedTagsLoaded?: (tags: string[]) => void
  onAddTags?: (tags: string[]) => void
}

export default function MemoDetailViewer({
  memo,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  cachedSummary = null,
  cachedSummaryError = null,
  cachedSuggestedTags = [],
  onSummaryLoaded,
  onSummaryError,
  onSuggestedTagsLoaded,
  onAddTags,
}: MemoDetailViewerProps) {
  const [summaryLoading, setSummaryLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleSummarize = useCallback(async () => {
    onSummaryError?.('')
    setSummaryLoading(true)
    try {
      const res = await fetch('/api/memo/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: memo.title,
          content: memo.content,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = data.error ?? '요약을 불러올 수 없습니다. API 키를 확인하세요.'
        onSummaryError?.(msg)
        return
      }
      const summaryText = typeof data.summary === 'string' ? data.summary : ''
      onSummaryLoaded?.(summaryText)
      if (Array.isArray(data.suggestedTags) && data.suggestedTags.length > 0) {
        onSuggestedTagsLoaded?.(data.suggestedTags.map((t: unknown) => String(t).trim()).filter(Boolean))
      }
    } catch {
      onSummaryError?.('요약을 불러올 수 없습니다. API 키를 확인하세요.')
    } finally {
      setSummaryLoading(false)
    }
  }, [
    memo.title,
    memo.content,
    onSummaryLoaded,
    onSummaryError,
    onSuggestedTagsLoaded,
  ])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      personal: 'bg-blue-100 text-blue-800',
      work: 'bg-green-100 text-green-800',
      study: 'bg-purple-100 text-purple-800',
      idea: 'bg-yellow-100 text-yellow-800',
      other: 'bg-gray-100 text-gray-800',
    }
    return colors[category as keyof typeof colors] || colors.other
  }

  const handleDelete = () => {
    if (window.confirm('정말로 이 메모를 삭제하시겠습니까?')) {
      onDelete(memo.id)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
      data-testid="memo-detail-viewer-backdrop"
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
        data-testid="memo-detail-viewer"
      >
        <div className="p-6">
          {/* 헤더 */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {memo.title}
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(memo.category)}`}
                >
                  {MEMO_CATEGORIES[memo.category as keyof typeof MEMO_CATEGORIES] ||
                    memo.category}
                </span>
                <span className="text-xs text-gray-500">
                  수정: {formatDate(memo.updatedAt)}
                </span>
                <span className="text-xs text-gray-400">
                  작성: {formatDate(memo.createdAt)}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ml-2"
              aria-label="닫기"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* 내용 - 마크다운 렌더링 */}
          <div
            className="mb-6 wmde-markdown-var min-h-[120px]"
            data-color-mode="light"
          >
            <MDMarkdown
              source={memo.content || ''}
              style={{ whiteSpace: 'pre-wrap' }}
            />
          </div>

          {/* 요약 (LLM) */}
          <div className="mb-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">요약</h3>
              <button
                type="button"
                onClick={handleSummarize}
                disabled={summaryLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="요약 생성"
                data-testid="memo-detail-summarize-btn"
              >
                {summaryLoading ? (
                  <>
                    <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full" />
                    요약 생성 중...
                  </>
                ) : (
                  '요약 생성'
                )}
              </button>
            </div>
            {cachedSummaryError && (
              <p
                className="text-sm text-red-600 mt-2"
                role="alert"
              >
                {cachedSummaryError}
              </p>
            )}
            {cachedSummary && !cachedSummaryError && (
              <div
                className="mt-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 leading-relaxed"
                role="status"
              >
                {cachedSummary}
              </div>
            )}
            {cachedSuggestedTags.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-500 mr-1">추천 태그:</span>
                {cachedSuggestedTags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-md"
                  >
                    #{tag}
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => onAddTags?.(cachedSuggestedTags)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  전체 추가
                </button>
              </div>
            )}
          </div>

          {/* 태그 */}
          {memo.tags.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-6">
              {memo.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => onEdit(memo)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
              data-testid="memo-detail-edit-btn"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              편집
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 border border-red-300 text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              data-testid="memo-detail-delete-btn"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              삭제
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
