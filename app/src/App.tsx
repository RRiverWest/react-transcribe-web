import './App.css'
import { useTranscription } from './useTranscription'

function App() {
  const {
    status,
    statusMessage,
    transcript,
    startRecording,
    stopRecording,
    clearTranscript,
    summary,
    isSummarizing,
    summaryMessage,
    canSummarize,
    summarize,
    summaryMinChars,
  } = useTranscription()

  const isRecording = status === 'recording'
  const hasTranscript = transcript.trim().length > 0

  return (
    <div className="app">
      {/* ヘッダー: タイトルとステータスピル */}
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            ◉
          </span>
          <span className="brand-name">Voice Notes</span>
        </div>
        <div
          className={`status-pill status-pill--${status}`}
          role="status"
          aria-live="polite"
        >
          <span className="status-dot" aria-hidden />
          {statusMessage}
        </div>
      </header>

      {/* メイン: スクロール領域 */}
      <main className="app-main">
        {/* 文字起こしカード */}
        <section className="card transcript-card" aria-label="Transcript">
          <div className="card-title">
            <span>文字起こし</span>
            <span className="char-count">{transcript.trim().length} 文字</span>
          </div>
          <div className="transcript-body">
            {hasTranscript ? (
              transcript
            ) : (
              <p className="placeholder">
                下のマイクボタンを押して話しかけると、ここにリアルタイムで
                文字起こしが表示されます。
              </p>
            )}
          </div>
        </section>

        {/* 要約カード (要約 or メッセージがあるときのみ) */}
        {(summary || summaryMessage) && (
          <section className="card summary-card" aria-label="Summary">
            <div className="card-title">
              <span>AI 要約</span>
              <span className="badge">Bedrock</span>
            </div>
            {summaryMessage && (
              <p className="summary-message">{summaryMessage}</p>
            )}
            {summary && <div className="summary-text">{summary}</div>}
          </section>
        )}

        {/* 使い方 */}
        <details className="how-to">
          <summary>使い方</summary>
          <ol>
            <li>マイクボタンをタップして録音を開始します。</li>
            <li>マイクに向かってはっきりと話してください。</li>
            <li>発話がリアルタイムで文字起こしされます。</li>
            <li>もう一度ボタンを押すと録音を停止します。</li>
            <li>「要約」で Bedrock による要約を生成できます。</li>
          </ol>
        </details>
      </main>

      {/* フッター操作バー: 大きな録音ボタン + サブアクション */}
      <footer className="control-bar">
        <button
          type="button"
          className="ghost-btn"
          onClick={clearTranscript}
          disabled={!hasTranscript && !summary}
          aria-label="Clear transcript"
        >
          <span className="ghost-icon" aria-hidden>
            ✕
          </span>
          クリア
        </button>

        <button
          type="button"
          className={`mic-btn ${isRecording ? 'mic-btn--recording' : ''}`}
          onClick={isRecording ? stopRecording : startRecording}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          <span className="mic-icon" aria-hidden>
            {isRecording ? '■' : '🎙'}
          </span>
        </button>

        <button
          type="button"
          className="ghost-btn"
          onClick={summarize}
          disabled={!canSummarize || isSummarizing}
          aria-label="Summarize with Bedrock"
          title={
            canSummarize
              ? 'Bedrock で要約します'
              : `要約は ${summaryMinChars} 文字以上で利用できます`
          }
        >
          <span className="ghost-icon" aria-hidden>
            {isSummarizing ? '…' : '✦'}
          </span>
          {isSummarizing ? '要約中' : '要約'}
        </button>
      </footer>
    </div>
  )
}

export default App
