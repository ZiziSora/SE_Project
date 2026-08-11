import { useParams } from 'react-router-dom';
import { EventForm } from '../components/EventForm.jsx';

/**
 * Trang chỉnh sửa sự kiện — route: /edit-event/:eventId
 * Dùng lại đúng form của trang tạo mới, chỉ khác ở chỗ nạp dữ liệu sẵn có
 * và gọi PUT /api/events/{id} khi lưu.
 */
export default function EditEvent() {
  const { eventId } = useParams();

  return <EventForm mode="edit" eventId={eventId} />;
}
