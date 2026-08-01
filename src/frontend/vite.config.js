import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: 'localhost', // Hoặc '0.0.0.0' nếu muốn cho phép truy cập từ các thiết bị khác trong cùng mạng LAN
    port: 5173,        // Thay đổi port theo ý muốn (mặc định của Vite thường là 5173)
    strictPort: true,  // Nếu port 3000 bị chiếm, Vite sẽ báo lỗi thay vì tự động đổi sang port khác
    cors: true,        // Bật CORS nếu cần gọi API từ backend khác domain
  }
})