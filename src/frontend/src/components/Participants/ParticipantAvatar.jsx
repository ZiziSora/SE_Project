import { getInitials } from "../../utils/participantUtils.js";

/** Ảnh đại diện sinh viên; chưa có ảnh thì hiển thị chữ cái đầu của tên. */
export default function ParticipantAvatar({ participant }) {
  if (participant.avatar_url) {
    return (
      <img
        src={participant.avatar_url}
        alt={`Ảnh đại diện ${participant.full_name}`}
        className="size-9 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-primary"
    >
      {getInitials(participant.full_name)}
    </span>
  );
}
