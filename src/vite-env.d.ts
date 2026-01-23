/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OLETV_KEYAPI: string;
  readonly VITE_OLETV_LOGIN: string;
  readonly VITE_OLETV_PASS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
