# 🎓 Smart University Event Ecosystem

Hệ thống quản lý sự kiện thông minh cho trường đại học, xây dựng với **React + Vite** (Frontend) và **FastAPI + Supabase** (Backend).

---

## 📋 Mục Lục

- [Yêu cầu chuẩn bị](#-yêu-cầu-chuẩn-bị-prerequisites)
- [Cấu trúc dự án](#-cấu-trúc-dự-án)
- [Bước 1: Clone Repository](#bước-1-clone-repository)
- [Bước 2: Cài đặt Backend](#bước-2-cài-đặt-backend-fastapi)
- [Bước 3: Cài đặt Frontend](#bước-3-cài-đặt-frontend-react--vite)
- [Bước 4: Cấu hình biến môi trường](#bước-4-cấu-hình-biến-môi-trường-env)
- [Bước 5: Chạy dự án](#bước-5-chạy-dự-án)
- [Ghi chú thêm](#-ghi-chú-thêm)

---

## 🛠 Yêu Cầu Chuẩn Bị (Prerequisites)

Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt đầy đủ các công cụ sau:

| Công cụ | Phiên bản khuyên dùng | Link tải |
|---|---|---|
| **Git** | Bất kỳ | [git-scm.com](https://git-scm.com/downloads) |
| **Node.js** | LTS (≥ 18.x) | [nodejs.org](https://nodejs.org/) |
| **Python** | ≥ 3.8 | [python.org](https://www.python.org/downloads/) |
| **VS Code** | Mới nhất | [code.visualstudio.com](https://code.visualstudio.com/) |

> **Extensions VS Code khuyên dùng:**
> - `Python` (Microsoft)
> - `Tailwind CSS IntelliSense`
> - `ESLint`

Kiểm tra xem đã cài đúng chưa bằng các lệnh:
```bash
git --version
node --version
python --version   # hoặc python3 --version trên macOS/Linux
```

---

## 📁 Cấu Trúc Dự Án

```
SE_Project/
├── src/
│   ├── backend/          # FastAPI – Python
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   └── venv/         # (được tạo sau khi setup, không commit)
│   └── frontend/         # React 19 + Vite + Tailwind CSS v4
│       ├── src/
│       ├── index.html
│       ├── package.json
│       └── vite.config.js
├── docs/                 # Tài liệu dự án
├── .gitignore
└── README.md
```

---

## Bước 1: Clone Repository

Mở Terminal / Git Bash / PowerShell và chạy lệnh:

```bash
git clone <Link-GitHub-Của-Dự-Án>
cd SE_Project
```

Sau đó chuyển sang nhánh `develop` để lấy code mới nhất:

```bash
git checkout develop
```

---

## Bước 2: Cài Đặt Backend (FastAPI)

### 2.1 – Di chuyển vào thư mục backend

```bash
cd src/backend
```

### 2.2 – Tạo môi trường ảo (Virtual Environment)

> ⚠️ **Bắt buộc** tạo `venv` để tránh xung đột thư viện với máy của bạn.

**Windows (PowerShell):**
```powershell
python -m venv venv
venv\Scripts\activate
```
Sau khi kích hoạt thành công, bạn sẽ thấy `(venv)` xuất hiện ở đầu dòng lệnh.

### 2.3 – Cài đặt các thư viện

```bash
pip install -r requirements.txt
```

---

## Bước 3: Cài Đặt Frontend (React + Vite)

### 3.1 – Mở terminal mới và di chuyển vào thư mục frontend

```bash
cd src/frontend
```

### 3.2 – Cài đặt các package Node.js

```bash
npm install
```

> **Lưu ý:** Thư mục `node_modules/` sẽ được tạo tự động và **không được commit** lên Git.

---

## Bước 4: Cấu Hình Biến Môi Trường (.env)

Dự án sử dụng **Supabase** làm backend-as-a-service. Bạn cần tạo file `.env` để cấu hình kết nối.

### 4.1 – Tạo file `.env` trong thư mục `src/backend/`

```bash
# src/backend/.env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
```

### 4.2 – Lấy thông tin Supabase

1. Đăng nhập vào [supabase.com](https://supabase.com)
2. Chọn đúng project của nhóm
3. Vào **Project Settings → API**
4. Copy **Project URL** và **anon/public key**

> **⚠️ Quan trọng:** File `.env` đã được thêm vào `.gitignore`. **Tuyệt đối không commit** file này lên GitHub vì chứa thông tin bảo mật. Liên hệ team leader để lấy thông tin Supabase của nhóm.

---

## Bước 5: Chạy Dự Án

Cần mở **2 terminal** chạy song song.

### Terminal 1 – Chạy Backend

```bash
# Đảm bảo đang ở trong src/backend/ và venv đã được kích hoạt
cd src/backend

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# Khởi chạy server
uvicorn main:app --reload
```

Backend sẽ chạy tại: **http://127.0.0.1:8000**

Kiểm tra API docs tại: **http://127.0.0.1:8000/docs** (Swagger UI tích hợp sẵn của FastAPI)

---

### Terminal 2 – Chạy Frontend

```bash
cd src/frontend
npm run dev
```

Frontend sẽ chạy tại: **http://localhost:5173**

---

## 📝 Ghi Chú Thêm

### Khi pull code mới từ Git

Sau mỗi lần `git pull`, hãy kiểm tra xem có thay đổi dependencies không:

```bash
# Backend – nếu requirements.txt thay đổi
cd src/backend
pip install -r requirements.txt

# Frontend – nếu package.json thay đổi
cd src/frontend
npm install
```

### Workflow Git cơ bản

```bash
# Tạo nhánh mới để làm feature
git checkout -b feature/ten-tinh-nang

# Sau khi làm xong, commit và push
git add .
git commit -m "feat: mô tả thay đổi"
git push origin feature/ten-tinh-nang
```

> Tạo Pull Request lên nhánh `develop` và yêu cầu review trước khi merge.

### Các lỗi thường gặp

| Lỗi | Nguyên nhân | Cách xử lý |
|---|---|---|
| `ModuleNotFoundError` | Chưa kích hoạt venv hoặc chưa install | Kích hoạt `venv` rồi chạy lại `pip install -r requirements.txt` |
| `ENOENT: node_modules` | Chưa chạy `npm install` | Chạy `npm install` trong `src/frontend/` |
| Lỗi kết nối Supabase | Thiếu hoặc sai file `.env` | Kiểm tra lại file `.env` trong `src/backend/` |
| Port 8000 bị chiếm | Có process khác đang dùng | Chạy `uvicorn main:app --reload --port 8001` |

---