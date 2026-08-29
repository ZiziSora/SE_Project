import { useState } from "react"
import { CalendarX2, Trash2 } from "lucide-react"
import { toast } from "react-toastify"

import { eventsApi } from "../api/eventApi.js"
import ConfirmDialog from "./ConfirmDialog.jsx"
import {
  extractApiErrorMessage,
  getRemovalAction,
  REMOVAL_MODE,
} from "../utils/eventManagementUtils.js"

/**
 * Hộp thoại xác nhận cho thao tác gỡ một sự kiện khỏi danh sách quản lý.
 *
 * Vì sao gom vào một component: hành động thật sự phụ thuộc trạng thái sự kiện
 * (bản nháp thì XOÁ hẳn, đang chờ duyệt / đang mở đăng ký thì HUỶ), và cùng một
 * logic đó đang dùng ở cả bảng "sự kiện gần đây" lẫn bảng "tất cả sự kiện". Đặt
 * chung ở đây để hai bảng không trôi lệch nhau mỗi lần sửa lời cảnh báo.
 *
 * @param {object} props
 * @param {object|null} props.event   Sự kiện đang chờ xác nhận (null = đóng)
 * @param {() => void}  props.onClose
 * @param {(eventId: string) => void} props.onDeleted    Đã xoá hẳn khỏi hệ thống
 * @param {(event: object) => void}   props.onCancelled  Đã huỷ — bản ghi vẫn còn
 */
export default function EventRemovalDialog({
  event,
  onClose,
  onDeleted,
  onCancelled,
}) {
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [openedEventId, setOpenedEventId] = useState(event?.event_id)

  // Mở hộp thoại cho một sự kiện khác thì ô lý do phải trắng lại, tránh gửi
  // nhầm lý do vừa gõ cho sự kiện trước đó. Chỉnh state ngay trong lúc render
  // (đúng khuyến nghị của React) thay vì useEffect — useEffect ở đây sẽ tạo
  // thêm một lượt render thừa mỗi lần mở hộp thoại.
  if (event?.event_id !== openedEventId) {
    setOpenedEventId(event?.event_id)
    setReason("")
  }

  if (!event) return null

  const action = getRemovalAction(event)
  const isCancel = action.mode === REMOVAL_MODE.CANCEL
  // Chỉ sự kiện đang mở đăng ký mới hỏi lý do: đó là trường hợp duy nhất có
  // sinh viên đã đăng ký để nhận thông báo huỷ kèm lý do.
  const needsReason = action.reasonRequired

  const handleConfirm = async () => {
    if (!event.event_id || isSubmitting) return
    setIsSubmitting(true)
    try {
      if (isCancel) {
        const updated = await eventsApi.cancel(event.event_id, reason.trim())
        onCancelled?.(updated)
      } else {
        await eventsApi.remove(event.event_id)
        onDeleted?.(event.event_id)
      }
      toast.success(action.successMessage)
      onClose()
    } catch (err) {
      console.error("Lỗi gỡ sự kiện:", err)
      toast.error(
        extractApiErrorMessage(
          err,
          isCancel ? "Không huỷ được sự kiện." : "Không xoá được sự kiện.",
        ),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ConfirmDialog
      open
      tone="danger"
      icon={isCancel ? CalendarX2 : Trash2}
      title={action.title}
      description={action.description}
      detailTitle={event.title ?? "Sự kiện chưa có tên"}
      detailSubtitle={event.event_id}
      confirmLabel={action.confirmLabel}
      isSubmitting={isSubmitting}
      reasonLabel={needsReason ? "Lý do huỷ gửi cho sinh viên" : undefined}
      reasonPlaceholder={
        needsReason
          ? "Ví dụ: Diễn giả báo bận đột xuất, ban tổ chức sẽ sắp lịch lại và thông báo sau."
          : undefined
      }
      reasonValue={reason}
      onReasonChange={needsReason ? setReason : undefined}
      reasonRequired={needsReason}
      onClose={() => !isSubmitting && onClose()}
      onConfirm={handleConfirm}
    />
  )
}
