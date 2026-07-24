import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Routes, Route } from "react-router-dom"
// Import 2 trang của bạn
import ManageEvents from "./pages/manage-events"
import AllEvents from "./pages/all-events"
import CreateEvent from "./pages/create-event"

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
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)