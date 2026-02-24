import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const MODEL = 'gemini-2.5-flash-lite'

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.' },
      { status: 503 }
    )
  }

  let body: { title?: string; content?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: '요청 본문이 올바른 JSON이 아닙니다.' },
      { status: 400 }
    )
  }

  const title = typeof body.title === 'string' ? body.title : ''
  const content = typeof body.content === 'string' ? body.content : ''

  if (!content.trim()) {
    return NextResponse.json(
      { error: '요약할 메모 내용이 없습니다.' },
      { status: 400 }
    )
  }

  const prompt = `다음 메모를 2~3문장으로 핵심만 요약하고, 메모 내용을 바탕으로 키워드 태그를 3~5개 추천해 주세요. 한국어로 답하세요.
응답은 반드시 아래 형식으로만 작성해 주세요. SUMMARY: 와 TAGS: 라벨을 꼭 사용하세요.

SUMMARY:
(여기에 요약 내용)

TAGS:
(태그1, 태그2, 태그3)

제목: ${title || '(없음)'}

내용:
${content}`

  try {
    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    })

    const raw = response.text?.trim()
    if (raw === undefined || raw === '') {
      return NextResponse.json(
        { error: '요약을 생성할 수 없었습니다.' },
        { status: 502 }
      )
    }

    let summary = ''
    const suggestedTags: string[] = []

    const summaryMatch = raw.match(/SUMMARY:\s*([\s\S]*?)(?=TAGS:|$)/i)
    if (summaryMatch) {
      summary = summaryMatch[1].trim()
    } else {
      summary = raw
    }

    const tagsMatch = raw.match(/TAGS:\s*([\s\S]*?)$/im)
    if (tagsMatch) {
      const tagsBlock = tagsMatch[1]
        .split(/[,，\n]+/)
        .map(s => s.trim())
        .filter(Boolean)
      suggestedTags.push(...tagsBlock)
    }

    return NextResponse.json({
      summary: summary || raw,
      suggestedTags,
    })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : '요약 생성 중 오류가 발생했습니다.'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
