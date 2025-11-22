# Hướng dẫn kiểm tra kết nối Appwrite

## ✅ Container đã được khởi động thành công!

## 🔍 Cách kiểm tra kết nối Appwrite:

### Bước 1: Mở trình duyệt
Truy cập: **http://localhost:5173**

### Bước 2: Mở Developer Console
- Nhấn `F12` hoặc `Ctrl + Shift + I` (Windows)
- Hoặc click chuột phải → "Inspect" → chọn tab **"Console"**

### Bước 3: Kiểm tra log trong Console

Bạn sẽ thấy một trong các trường hợp sau:

#### ✅ **Kết nối thành công:**
```
🔍 Đang kiểm tra biến môi trường Appwrite...
  ✓ VITE_APPWRITE_ENDPOINT: https://sgp.cloud.appwrite.io/v1
  ✓ VITE_APPWRITE_PROJECT_ID: 691dc4e0001e74dc3de0
  ✓ VITE_APPWRITE_DATABASE_ID: 691dc832001f20af94a5
  ...
✅ Appwrite client đã được khởi tạo thành công
```

#### ❌ **Kết nối thất bại:**
```
🔍 Đang kiểm tra biến môi trường Appwrite...
  ✗ VITE_APPWRITE_ENDPOINT: undefined hoặc rỗng
  ✗ VITE_APPWRITE_PROJECT_ID: undefined hoặc rỗng
  ...
❌ Các biến môi trường sau đây bị thiếu hoặc không hợp lệ: ...
❌ Không thể khởi tạo Appwrite client: thiếu ENDPOINT hoặc PROJECT_ID
```

## 🔧 Nếu gặp lỗi:

### 1. Kiểm tra file .env
Đảm bảo file `.env` có format đúng (không có khoảng trắng, không có dấu ngoặc kép):
```env
VITE_APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=691dc4e0001e74dc3de0
VITE_APPWRITE_DATABASE_ID=691dc832001f20af94a5
VITE_APPWRITE_STORAGE_ID=691dc8f8003d5a2ea61e
VITE_APPWRITE_USER_COLLECTION_ID=users
VITE_APPWRITE_POST_COLLECTION_ID=posts
VITE_APPWRITE_SAVES_COLLECTION_ID=saves
```

### 2. Restart container
```bash
docker-compose restart web
```

### 3. Rebuild container (nếu cần)
```bash
docker-compose down
docker-compose up --build
```

### 4. Kiểm tra biến môi trường trong container
```bash
docker-compose exec web env | grep VITE
```

## 📝 Lưu ý:
- Logs từ Appwrite config sẽ chỉ hiển thị trong **Browser Console**, không phải trong Docker logs
- Nếu thấy thông báo "✅ Appwrite client đã được khởi tạo thành công" → Kết nối thành công! 🎉
- Nếu thấy lỗi về biến môi trường → Kiểm tra lại file `.env` và restart container

