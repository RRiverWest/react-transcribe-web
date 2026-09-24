import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

// サーバー(server.js)から受信する文字起こしイベントの型
interface TranscriptionData {
  text: string
  isFinal: boolean
}

export type RecordingStatus = 'idle' | 'recording' | 'error'

// 接続先。未指定なら同一オリジン(元の index.html の io() と同じ挙動)
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL as string | undefined

export function useTranscription() {
  const [status, setStatus] = useState<RecordingStatus>('idle')
  const [statusMessage, setStatusMessage] = useState('Not recording')
  const [transcript, setTranscript] = useState('')

  const socketRef = useRef<Socket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioInputRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // 確定済み文字列を保持(元コードの currentTranscript 相当)
  const finalTranscriptRef = useRef('')

  // Socket.IO の初期化とイベントハンドラ登録
  useEffect(() => {
    const socket = SOCKET_URL ? io(SOCKET_URL) : io()
    socketRef.current = socket

    socket.on('transcription', (data: TranscriptionData) => {
      if (data.isFinal) {
        finalTranscriptRef.current += data.text + ' '
        setTranscript(finalTranscriptRef.current)
      } else {
        // 部分結果は確定済み文字列に連結して表示
        setTranscript(finalTranscriptRef.current + data.text)
      }
    })

    socket.on('error', (errorMessage: string) => {
      console.error('Server error:', errorMessage)
      setTranscript((prev) => prev + '\nError: ' + errorMessage)
    })

    return () => {
      socket.off('transcription')
      socket.off('error')
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  const cleanupAudio = useCallback(() => {
    processorRef.current?.disconnect()
    audioInputRef.current?.disconnect()
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      void audioContextRef.current.close()
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    processorRef.current = null
    audioInputRef.current = null
    audioContextRef.current = null
    streamRef.current = null
  }, [])

  const startRecording = useCallback(async () => {
    const socket = socketRef.current
    if (!socket) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const audioContext = new AudioContext()
      audioContextRef.current = audioContext

      const audioInput = audioContext.createMediaStreamSource(stream)
      audioInputRef.current = audioInput

      const processor = audioContext.createScriptProcessor(1024, 1, 1)
      processorRef.current = processor

      audioInput.connect(processor)
      processor.connect(audioContext.destination)

      processor.onaudioprocess = (e) => {
        const float32Array = e.inputBuffer.getChannelData(0)
        const int16Array = new Int16Array(float32Array.length)
        for (let i = 0; i < float32Array.length; i++) {
          int16Array[i] = Math.max(
            -32768,
            Math.min(32767, Math.floor(float32Array[i] * 32768)),
          )
        }
        socket.emit('audioData', int16Array.buffer)
      }

      socket.emit('startTranscription')
      setStatus('recording')
      setStatusMessage('Recording')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('Error accessing microphone:', error)
      setStatus('error')
      setStatusMessage('Error: ' + message)
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      cleanupAudio()
      socketRef.current?.emit('stopTranscription')
      setStatus('idle')
      setStatusMessage('Not recording')
    }
  }, [cleanupAudio])

  const clearTranscript = useCallback(() => {
    finalTranscriptRef.current = ''
    setTranscript('')
  }, [])

  // アンマウント時に音声リソースを解放
  useEffect(() => cleanupAudio, [cleanupAudio])

  return {
    status,
    statusMessage,
    transcript,
    startRecording,
    stopRecording,
    clearTranscript,
  }
}
