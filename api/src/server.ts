import http from 'node:http'
import cors from 'cors'
import express from 'express'
import { Server, type Socket } from 'socket.io'
import {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
  type AudioStream,
  type LanguageCode,
} from '@aws-sdk/client-transcribe-streaming'

// ---- 設定 (環境変数で上書き可能) ----
const PORT = Number(process.env.PORT ?? 3001)
const AWS_REGION = process.env.AWS_REGION ?? 'us-west-2'
const LANGUAGE_CODE = (process.env.LANGUAGE_CODE ?? 'ja-JP') as LanguageCode
const SAMPLE_RATE = Number(process.env.MEDIA_SAMPLE_RATE ?? 44100)
// フロント(Vite)のオリジン。'*' で全許可、カンマ区切りで複数指定可。
// 注意: '*' を配列 ['*'] で渡すと Socket.IO はリテラル比較して一致しないため、
//       単一 '*' の場合は文字列のまま渡す。
const CORS_ORIGIN_RAW = process.env.CORS_ORIGIN ?? '*'
const CORS_ORIGIN: string | string[] =
  CORS_ORIGIN_RAW.trim() === '*'
    ? '*'
    : CORS_ORIGIN_RAW.split(',').map((o) => o.trim())

const app = express()
app.use(cors({ origin: CORS_ORIGIN }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
  },
})

const transcribeClient = new TranscribeStreamingClient({ region: AWS_REGION })

// フロントから受信する音声チャンクの型 (Int16 PCM の ArrayBuffer)
type AudioChunk = ArrayBuffer | Buffer | Uint8Array

/**
 * socket から届く 'audioData' を内部キューにためつつ、
 * Amazon Transcribe が要求する async iterable として供給するヘルパ。
 * 元実装の socket.once による取りこぼしを防ぐ。
 */
class AudioStreamPump {
  private queue: Buffer[] = []
  private resolvers: ((value: Buffer | null) => void)[] = []
  private closed = false

  push(chunk: AudioChunk) {
    if (this.closed) return
    const buf = Buffer.from(chunk as ArrayBuffer)
    const resolver = this.resolvers.shift()
    if (resolver) {
      resolver(buf)
    } else {
      this.queue.push(buf)
    }
  }

  close() {
    this.closed = true
    // 待機中の consumer を解放
    while (this.resolvers.length > 0) {
      this.resolvers.shift()?.(null)
    }
  }

  private next(): Promise<Buffer | null> {
    const queued = this.queue.shift()
    if (queued) return Promise.resolve(queued)
    if (this.closed) return Promise.resolve(null)
    return new Promise((resolve) => this.resolvers.push(resolve))
  }

  // Amazon Transcribe 用の AudioStream (async generator)
  async *stream(): AsyncGenerator<AudioStream> {
    while (true) {
      const chunk = await this.next()
      if (chunk === null) break
      yield { AudioEvent: { AudioChunk: new Uint8Array(chunk) } }
    }
  }
}

io.on('connection', (socket: Socket) => {
  console.log('A user connected:', socket.id)

  let pump: AudioStreamPump | null = null
  let isTranscribing = false

  socket.on('startTranscription', async () => {
    if (isTranscribing) return
    console.log('Starting transcription for', socket.id)
    isTranscribing = true
    pump = new AudioStreamPump()

    const command = new StartStreamTranscriptionCommand({
      LanguageCode: LANGUAGE_CODE,
      MediaSampleRateHertz: SAMPLE_RATE,
      MediaEncoding: 'pcm',
      AudioStream: pump.stream(),
    })

    try {
      const response = await transcribeClient.send(command)
      if (!response.TranscriptResultStream) {
        socket.emit('error', 'No transcript stream returned from Amazon Transcribe')
        return
      }

      for await (const event of response.TranscriptResultStream) {
        if (!isTranscribing) break
        const results = event.TranscriptEvent?.Transcript?.Results
        if (!results || results.length === 0) continue

        const alternatives = results[0].Alternatives
        if (!alternatives || alternatives.length === 0) continue

        const text = alternatives[0].Transcript ?? ''
        const isFinal = !results[0].IsPartial

        // フロントの受信仕様: { text, isFinal }
        socket.emit('transcription', { text, isFinal })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('Transcription error:', error)
      socket.emit('error', 'Transcription error occurred: ' + message)
    } finally {
      isTranscribing = false
      pump?.close()
      pump = null
    }
  })

  // フロントは Int16 PCM の ArrayBuffer を送ってくる
  socket.on('audioData', (data: AudioChunk) => {
    if (isTranscribing && pump) {
      pump.push(data)
    }
  })

  socket.on('stopTranscription', () => {
    console.log('Stopping transcription for', socket.id)
    isTranscribing = false
    pump?.close()
    pump = null
  })

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
    isTranscribing = false
    pump?.close()
    pump = null
  })
})

server.listen(PORT, () => {
  console.log(`Transcribe API server running on http://localhost:${PORT}`)
  console.log(`  region=${AWS_REGION} language=${LANGUAGE_CODE} sampleRate=${SAMPLE_RATE}`)
  console.log(
    `  CORS origin=${Array.isArray(CORS_ORIGIN) ? CORS_ORIGIN.join(', ') : CORS_ORIGIN}`,
  )
})
