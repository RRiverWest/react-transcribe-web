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
  } = useTranscription()

  return (
    <div className="page-container">
      <div className="container">
        <h1>Real-time Audio Transcription</h1>

        <div className="status">
          Status: <span id="statusText">{statusMessage}</span>{' '}
          <span id="statusIndicator">
            {status === 'recording' ? '🔴' : '⚪'}
          </span>
        </div>

        <div className="button-container">
          <button
            id="startButton"
            onClick={startRecording}
            disabled={status === 'recording'}
          >
            Start Transcription
          </button>
          <button
            id="stopButton"
            onClick={stopRecording}
            disabled={status !== 'recording'}
          >
            Stop Transcription
          </button>
          <button id="clearButton" onClick={clearTranscript}>
            Clear Transcript
          </button>
        </div>

        <div id="transcript">{transcript}</div>

        <div className="info-section">
          <h2>How to use:</h2>
          <ul>
            <li>Click "Start Transcription" to begin recording.</li>
            <li>Speak clearly into your microphone.</li>
            <li>Watch as your speech is transcribed in real-time.</li>
            <li>Click "Stop Transcription" when you're done.</li>
            <li>Use "Clear Transcript" to remove all transcribed text.</li>
          </ul>
        </div>

        <div className="footer">
          <p>
            © Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights
            Reserved.
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
