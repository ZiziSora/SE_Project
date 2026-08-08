import { EventForm } from '../components/event-form';

/**
 * Trang tạo sự kiện mới.
 * Toàn bộ giao diện và logic nằm trong `components/event-form.tsx` để dùng chung
 * với trang chỉnh sửa — sửa form một lần là cả hai trang đổi theo.
 */
export default function CreateEvent() {
  return <EventForm mode="create" />;
}