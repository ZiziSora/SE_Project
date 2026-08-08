import { useParams } from 'react-router-dom';
import { EventForm } from '../components/event-form';

/**
 * Trang chỉnh sửa sự kiện — route: /edit-event/:eventId
 * Dùng lại đúng form của trang tạo mới, chỉ khác ở chỗ nạp dữ liệu sẵn có
 * và gọi PUT /api/events/{id} khi lưu.
 */
export default function EditEvent() {
  const { eventId } = useParams<{ eventId: string }>();

  return <EventForm mode="edit" eventId={eventId} />;
}