# react-transcribe API

`amazon-transcribe-websocket/server.js` を TypeScript へ移行したリアルタイム
文字起こしバックエンドです。Express + Socket.IO + Amazon Transcribe Streaming。

フロント(`../app`)とは Socket.IO で以下のイベントをやり取りします(元実装と同一仕様)。

- 受信: `startTranscription` / `audioData`(Int16 PCM の ArrayBuffer) / `stopTranscription`
- 送信: `transcription`(`{ text, isFinal }`) / `error`(string)

## セットアップ (Docker 不使用)

```
cd react-transcribe/api
npm install
cp .env.example .env   # 必要に応じて編集
```

AWS 認証情報は環境変数 (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`)、
`~/.aws/credentials`、IAM ロールなど標準の方法で解決されます。
`transcribe:StartStreamTranscription` 権限が必要です。

## 起動

開発 (ホットリロード):

```
npm run dev
```

本番相当 (ビルドして起動):

```
npm run build
npm start
```

`.env` を読み込みたい場合は Node の `--env-file` を利用できます:

```
node --env-file=.env dist/server.js
```

## 環境変数

| 変数              | 既定値                                  | 説明                              |
| ----------------- | --------------------------------------- | --------------------------------- |
| PORT              | 3001                                    | 待ち受けポート                    |
| AWS_REGION        | ap-northeast-1                          | Transcribe のリージョン           |
| LANGUAGE_CODE     | ja-JP                                   | 文字起こし言語                    |
| MEDIA_SAMPLE_RATE | 44100                                   | サンプルレート(フロントと一致させる) |
| CORS_ORIGIN       | \*                                      | 許可オリジン(カンマ区切り)        |

## フロントとの整合

フロント側は `../app/.env` の `VITE_SOCKET_URL` で接続先を指定します
(既定 `http://localhost:3001`)。api を別ポートで動かすため CORS を許可しています。
