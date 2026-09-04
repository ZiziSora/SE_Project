import { EventForm } from '../components/EventForm.jsx';

/**
 * Trang tạo sự kiện mới.
 * Toàn bộ giao diện và logic nằm trong `components/event-form.jsx` để dùng chung
 * với trang chỉnh sửa và trang xem — sửa form một lần là cả ba trang đổi theo.
 */
export default function CreateEvent() {
  return <EventForm mode="create" />;
}
