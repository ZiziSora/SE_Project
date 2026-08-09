import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

import App from './App.jsx'

import "./index.css"

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Trang chủ - Dashboard sẽ nằm ở đường dẫn gốc "/" */}
        <Route path="/" element={<ManageEvents />} />
        <Route path="/create-event" element={<CreateEvent />} />
        {/* Trang tất cả sự kiện sẽ nằm ở đường dẫn "/all-events" */}
        <Route path="/all-events" element={<AllEvents />} />

        {/* Chỉnh sửa sự kiện. Tên tham số phải là `eventId` vì edit-event.tsx
            đọc bằng useParams<{ eventId: string }>() */}
        <Route path="/edit-event/:eventId" element={<EditEvent />} />

        {/* Xem chi tiết sự kiện (nút con mắt trong bảng) — chế độ chỉ đọc */}
        <Route path="/events/:eventId" element={<ViewEvent />} />

        {/* Bắt mọi đường dẫn không khớp — thay vì để màn hình trắng khó hiểu */}
        <Route
          path="*"
          element={
            <div style={{ padding: "48px", textAlign: "center", fontFamily: "sans-serif" }}>
              <h1 style={{ fontSize: "20px", fontWeight: 700 }}>Không tìm thấy trang</h1>
              <p style={{ marginTop: "8px", color: "#64748b", fontSize: "13px" }}>
                Đường dẫn này chưa được khai báo trong router.
              </p>
              <a href="/" style={{ marginTop: "12px", display: "inline-block", color: "#7c3aed", fontSize: "13px" }}>
                Quay lại Dashboard
              </a>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)