/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APPWRITE_ENDPOINT: string;
  readonly VITE_APPWRITE_PROJECT_ID: string;
  readonly VITE_APPWRITE_DATABASE_ID: string;
  readonly VITE_APPWRITE_STORAGE_ID: string;
  readonly VITE_APPWRITE_USER_COLLECTION_ID: string;
  readonly VITE_APPWRITE_POST_COLLECTION_ID: string;
  readonly VITE_APPWRITE_SAVES_COLLECTION_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}