# Snapgram - Social Media Application

Ứng dụng mạng xã hội được xây dựng với React, TypeScript, và Appwrite.

## 📋 Mục lục

- [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
- [Cài đặt và khởi động](#cài-đặt-và-khởi-động)
  - [Cách 1: Sử dụng Docker (Khuyến nghị)](#cách-1-sử-dụng-docker-khuyến-nghị)
  - [Cách 2: Chạy trực tiếp với Node.js](#cách-2-chạy-trực-tiếp-với-nodejs)
- [Cấu hình Appwrite](#cấu-hình-appwrite)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Scripts có sẵn](#scripts-có-sẵn)
- [Troubleshooting](#troubleshooting)

## 🛠️ Yêu cầu hệ thống

- **Docker** và **Docker Compose** (nếu dùng Docker)
- Hoặc **Node.js** >= 18.x và **npm** (nếu chạy trực tiếp)
- Tài khoản **Appwrite** (Cloud hoặc self-hosted)

## 🚀 Cài đặt và khởi động

### Cách 1: Sử dụng Docker (Khuyến nghị)

Phương pháp này không yêu cầu cài đặt Node.js trên máy của bạn.

#### Bước 1: Clone repository và di chuyển vào thư mục dự án

```bash
cd social_media_app
```

#### Bước 2: Tạo file `.env`

Tạo file `.env` trong thư mục `social_media_app` với nội dung sau:

```env
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_project_id
VITE_APPWRITE_DATABASE_ID=your_database_id
VITE_APPWRITE_STORAGE_ID=your_storage_id
VITE_APPWRITE_USER_COLLECTION_ID=your_user_collection_id
VITE_APPWRITE_POST_COLLECTION_ID=your_post_collection_id
VITE_APPWRITE_SAVES_COLLECTION_ID=your_saves_collection_id
```

**Lưu ý:** Thay thế các giá trị `your_*` bằng thông tin thực tế từ Appwrite Console của bạn (xem phần [Cấu hình Appwrite](#cấu-hình-appwrite)).

#### Bước 3: Build và khởi động container

```bash
docker compose up --build
```

Lần đầu tiên, Docker sẽ tải image và cài đặt dependencies (có thể mất vài phút).

#### Bước 4: Truy cập ứng dụng

Mở trình duyệt và truy cập: **http://localhost:5173**

#### Các lệnh Docker hữu ích

- **Dừng container:** Nhấn `Ctrl+C` hoặc chạy `docker compose down`
- **Chạy ở chế độ nền:** `docker compose up -d`
- **Xem logs:** `docker compose logs -f`
- **Khởi động lại:** `docker compose restart`
- **Rebuild image:** `docker compose up --build`

### Cách 2: Chạy trực tiếp với Node.js

Nếu bạn đã cài Node.js trên máy, có thể chạy trực tiếp:

#### Bước 1: Cài đặt dependencies

```bash
npm install
```

#### Bước 2: Tạo file `.env`

Tạo file `.env` giống như hướng dẫn ở [Cách 1 - Bước 2](#bước-2-tạo-file-env).

#### Bước 3: Khởi động dev server

```bash
npm run dev
```

#### Bước 4: Truy cập ứng dụng

Mở trình duyệt và truy cập: **http://localhost:5173**

## ⚙️ Cấu hình Appwrite

### Tạo tài khoản Appwrite

1. Truy cập [Appwrite Cloud](https://cloud.appwrite.io/) hoặc tự host Appwrite server
2. Đăng ký/đăng nhập tài khoản

### Tạo Project

1. Vào **Console** → **Create Project**
2. Đặt tên project và lưu lại **Project ID**

### Tạo Database

1. Vào **Databases** → **Create Database**
2. Lưu lại **Database ID**

### Tạo Collections

Trong database vừa tạo, tạo 3 collections:

#### Collection: `users`
- **Collection ID:** Lưu lại ID này
- **Permissions:** 
  - Create: `users` (role)
  - Read: `any`
  - Update: `users` (role)
  - Delete: `users` (role)

**Attributes:**
- `name` (String, required)
- `username` (String, required, unique)
- `email` (String, required, unique)
- `bio` (String, optional)
- `imageUrl` (String, optional)
- `imageId` (String, optional)

#### Collection: `posts`
- **Collection ID:** Lưu lại ID này
- **Permissions:**
  - Create: `users` (role)
  - Read: `any`
  - Update: `users` (role)
  - Delete: `users` (role)

**Attributes:**
- `creator` (String, required)
- `caption` (String, optional)
- `tags` (String[], optional)
- `imageUrl` (String, required)
- `imageId` (String, required)
- `location` (String, optional)
- `likes` (String[], optional)

#### Collection: `saves`
- **Collection ID:** Lưu lại ID này
- **Permissions:**
  - Create: `users` (role)
  - Read: `users` (role)
  - Update: `users` (role)
  - Delete: `users` (role)

**Attributes:**
- `user` (String, required)
- `post` (String, required)

### Tạo Storage Bucket

1. Vào **Storage** → **Create Bucket**
2. Đặt tên bucket (ví dụ: `media`)
3. Lưu lại **Bucket ID**
4. **Permissions:**
   - Create: `users` (role)
   - Read: `any`
   - Update: `users` (role)
   - Delete: `users` (role)

### Cấu hình Platform (Quan trọng!)

1. Vào **Settings** → **Platforms** → **Add Platform**
2. Chọn **Web App**
3. Nhập tên (ví dụ: `Local Development`)
4. Nhập hostname: `localhost` (hoặc domain của bạn)
5. Lưu lại

**Lưu ý:** Nếu không thêm platform, Appwrite sẽ từ chối các request từ trình duyệt và bạn sẽ thấy lỗi CORS hoặc "Waiting for connection".

### Bật Authentication

1. Vào **Auth** → **Settings**
2. Bật **Email/Password** provider
3. (Tùy chọn) Bật các provider khác như Google OAuth

### Điền thông tin vào `.env`

Sau khi có đầy đủ thông tin, cập nhật file `.env`:

```env
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
# Hoặc nếu self-hosted: VITE_APPWRITE_ENDPOINT=http://your-appwrite-server/v1

VITE_APPWRITE_PROJECT_ID=691dc4e0001e74dc3de0
VITE_APPWRITE_DATABASE_ID=691dc832001f20af94a5
VITE_APPWRITE_STORAGE_ID=691dc8f8003d5a2ea61e
VITE_APPWRITE_USER_COLLECTION_ID=users
VITE_APPWRITE_POST_COLLECTION_ID=posts
VITE_APPWRITE_SAVES_COLLECTION_ID=saves
```

## 📁 Cấu trúc dự án

```
social_media_app/
├── src/
│   ├── _auth/              # Authentication pages
│   ├── _root/              # Protected pages
│   ├── components/         # Reusable components
│   ├── lib/
│   │   └── appwrite/       # Appwrite configuration & API
│   ├── context/            # React Context providers
│   ├── hooks/              # Custom React hooks
│   └── types/              # TypeScript type definitions
├── public/                 # Static assets
├── .env                    # Environment variables (không commit)
├── Dockerfile              # Docker image configuration
├── docker-compose.yml      # Docker Compose configuration
└── package.json            # Dependencies và scripts
```

## 📜 Scripts có sẵn

- `npm run dev` - Khởi động development server
- `npm run build` - Build production
- `npm run lint` - Chạy ESLint để kiểm tra code
- `npm run preview` - Preview production build

## 🔧 Troubleshooting

### Lỗi: "Cannot find module 'appwrite'"

**Nguyên nhân:** TypeScript server trong VS Code chưa nhận diện được dependencies.

**Giải pháp:**
1. Đảm bảo đã chạy `npm install` (nếu dùng Node.js trực tiếp)
2. Trong VS Code, mở Command Palette (`Ctrl+Shift+P`)
3. Chọn `TypeScript: Restart TS Server`
4. Nếu vẫn lỗi, kiểm tra file `.vscode/settings.json` có dòng:
   ```json
   {
     "typescript.tsdk": "node_modules/typescript/lib"
   }
   ```

### Lỗi: "Waiting for connection" trong Appwrite Console

**Nguyên nhân:** Chưa thêm Web Platform hoặc endpoint không đúng.

**Giải pháp:**
1. Vào Appwrite Console → Settings → Platforms
2. Đảm bảo đã thêm Web App với hostname `localhost`
3. Kiểm tra `VITE_APPWRITE_ENDPOINT` trong `.env` đúng format (có `/v1` ở cuối)

### Lỗi: "user_session_already_exists"

**Nguyên nhân:** Bạn đã đăng nhập rồi nhưng vẫn cố tạo session mới.

**Giải pháp:**
- Sau khi signup, Appwrite tự động tạo session. Chỉ cần refresh trang, không cần login lại.
- Nếu muốn test login, hãy logout trước (hoặc xóa cookie `appwrite_session` trong DevTools).

### Container Docker không nhận biến môi trường mới

**Giải pháp:**
1. Dừng container: `docker compose down`
2. Khởi động lại: `docker compose up`
3. Nếu vẫn không được, rebuild: `docker compose up --build`

### Lỗi CORS khi gọi API

**Nguyên nhân:** Chưa thêm platform hoặc hostname không khớp.

**Giải pháp:**
- Kiểm tra lại phần [Cấu hình Platform](#cấu-hình-platform-quan-trọng)
- Đảm bảo hostname trong Appwrite Console khớp với URL bạn đang truy cập (ví dụ: `localhost`)

## 📝 Ghi chú

- File `.env` không được commit vào Git (đã có trong `.gitignore`)
- Khi thay đổi `.env`, cần khởi động lại container/server
- Development server hỗ trợ hot reload, code thay đổi sẽ tự động cập nhật

## 📚 Tài liệu tham khảo

- [Appwrite Documentation](https://appwrite.io/docs)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Docker Documentation](https://docs.docker.com/)

---

**Chúc bạn code vui vẻ! 🚀**

