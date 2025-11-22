import { Client, Account, Databases, Storage, Avatars } from "appwrite";

// Kiểm tra và validate các biến môi trường
const requiredEnvVars = {
  VITE_APPWRITE_ENDPOINT: import.meta.env.VITE_APPWRITE_ENDPOINT,
  VITE_APPWRITE_PROJECT_ID: import.meta.env.VITE_APPWRITE_PROJECT_ID,
  VITE_APPWRITE_DATABASE_ID: import.meta.env.VITE_APPWRITE_DATABASE_ID,
  VITE_APPWRITE_STORAGE_ID: import.meta.env.VITE_APPWRITE_STORAGE_ID,
  VITE_APPWRITE_USER_COLLECTION_ID: import.meta.env.VITE_APPWRITE_USER_COLLECTION_ID,
  VITE_APPWRITE_POST_COLLECTION_ID: import.meta.env.VITE_APPWRITE_POST_COLLECTION_ID,
  VITE_APPWRITE_SAVES_COLLECTION_ID: import.meta.env.VITE_APPWRITE_SAVES_COLLECTION_ID,
};

// Debug: Log tất cả biến môi trường (ẩn giá trị nhạy cảm)
console.log("🔍 Đang kiểm tra biến môi trường Appwrite...");
Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (value) {
    console.log(`  ✓ ${key}: ${value.substring(0, 30)}${value.length > 30 ? '...' : ''}`);
  } else {
    console.warn(`  ✗ ${key}: undefined hoặc rỗng`);
  }
});

// Kiểm tra các biến môi trường bắt buộc
const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value || value === "undefined")
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error(
    "❌ Các biến môi trường sau đây bị thiếu hoặc không hợp lệ:",
    missingVars.join(", ")
  );
  console.error(
    "⚠️ Vui lòng kiểm tra file .env và đảm bảo tất cả các biến đều được định nghĩa đúng format (không có khoảng trắng xung quanh dấu =, không có dấu ngoặc kép)"
  );
  console.error(
    "💡 Nếu đang dùng Docker, hãy thử: docker-compose down && docker-compose up --build"
  );
}

export const appwriteConfig = {
  url: requiredEnvVars.VITE_APPWRITE_ENDPOINT || "",
  projectId: requiredEnvVars.VITE_APPWRITE_PROJECT_ID || "",
  databaseId: requiredEnvVars.VITE_APPWRITE_DATABASE_ID || "",
  storageId: requiredEnvVars.VITE_APPWRITE_STORAGE_ID || "",
  userCollectionId: requiredEnvVars.VITE_APPWRITE_USER_COLLECTION_ID || "",
  postCollectionId: requiredEnvVars.VITE_APPWRITE_POST_COLLECTION_ID || "",
  savesCollectionId: requiredEnvVars.VITE_APPWRITE_SAVES_COLLECTION_ID || "",
};

export const client = new Client();

// Chỉ khởi tạo client nếu có đủ thông tin
if (appwriteConfig.url && appwriteConfig.projectId) {
  client.setEndpoint(appwriteConfig.url);
  client.setProject(appwriteConfig.projectId);
  console.log("✅ Appwrite client đã được khởi tạo thành công");
} else {
  console.error(
    "❌ Không thể khởi tạo Appwrite client: thiếu ENDPOINT hoặc PROJECT_ID"
  );
}

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const avatars = new Avatars(client);
