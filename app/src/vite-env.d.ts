/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SOCKET_URL?: string
  readonly VITE_SUMMARY_MIN_CHARS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
