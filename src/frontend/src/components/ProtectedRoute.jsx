import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ allowedRole, children }) {
    const location = useLocation();

    // Lấy thông tin user đã đăng nhập. 
    // Tạm thời bỏ cái mock || { role: "student" } đi để test logic thật, 
    // hoặc bạn có thể giữ lại để test nếu chưa nối API Login.
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));

    // Tình huống 1: Khách vãng lai (Chưa đăng nhập) -> Bắt đi Login
    if (!currentUser) {
        // Truyền state location để login xong trả về đúng trang cũ
        return <Navigate to="/auth/login" state={{ from: location }} replace />;
    }

    // Tình huống 2: Có tài khoản nhưng đi nhầm khu vực của Role khác
    if (currentUser.role !== allowedRole) {
        // Tự động điều hướng về đúng "địa bàn" của Role đó
        if (currentUser.role === "organizer") {
            return <Navigate to="/organizer" replace />;
        }
        if (currentUser.role === "admin") {
            return <Navigate to="/admin" replace />;
        }
        // Mặc định là student
        return <Navigate to="/" replace />;
    }

    // Tình huống 3: Hợp lệ -> Cho phép truy cập component bên trong
    return children;
}