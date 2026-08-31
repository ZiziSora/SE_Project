import { useState } from "react";
import { Building2, MapPinned, Phone, ShieldCheck } from "lucide-react";

function getInitials(name) {
  if (!name) return "BT";

  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export function OrganizerSpotlight({ organizer }) {
  const organizerName = organizer?.name || "Ban tổ chức sự kiện";
  const avatarUrl = organizer?.avatar_url || "";
  const [failedAvatarUrl, setFailedAvatarUrl] = useState("");
  const showAvatar = avatarUrl && avatarUrl !== failedAvatarUrl;

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {/* Header strip */}
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="font-manrope text-lg font-bold tracking-[-0.02em] text-[#21182c]">
          Ban tổ chức
        </h2>
        <p className="mt-0.5 text-xs text-slate-400">
          Đơn vị phụ trách và hỗ trợ thông tin sự kiện.
        </p>
      </div>

      <div className="p-5">
        {/* Avatar + Name */}
        <div className="flex items-center gap-3.5">
          <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-base font-bold text-white shadow-sm">
            {showAvatar ? (
              <img
                src={avatarUrl}
                alt={`Logo ${organizerName}`}
                className="size-full object-cover"
                onError={() => setFailedAvatarUrl(avatarUrl)}
              />
            ) : (
              <span>{getInitials(organizerName)}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-violet-600">
              <ShieldCheck className="size-3" strokeWidth={2.5} />
              Tổ chức bởi
            </div>
            <p className="mt-0.5 truncate text-[15px] font-bold text-[#21182c]">
              {organizerName}
            </p>
            <p className="truncate text-xs text-slate-400">
              {organizer?.organization_type || "Đơn vị thuộc trường"}
            </p>
          </div>
        </div>

        {/* Description */}
        {organizer?.description && (
          <p className="mt-4 text-sm leading-6 text-slate-600">
            {organizer.description}
          </p>
        )}

        {/* Contact details */}
        {(organizer?.department_name ||
          organizer?.contact_phone ||
          organizer?.office_address) && (
          <div className="mt-4 space-y-2.5 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 text-sm">
            {organizer?.department_name && (
              <span className="flex items-center gap-2 text-slate-600">
                <Building2 className="size-3.5 shrink-0 text-violet-500" strokeWidth={2} />
                {organizer.department_name}
              </span>
            )}
            {organizer?.contact_phone && (
              <a
                href={`tel:${organizer.contact_phone}`}
                className="flex items-center gap-2 font-medium text-slate-700 transition hover:text-violet-700"
              >
                <Phone className="size-3.5 shrink-0 text-violet-500" strokeWidth={2} />
                {organizer.contact_phone}
              </a>
            )}
            {organizer?.office_address && (
              <span className="flex items-center gap-2 text-slate-600">
                <MapPinned className="size-3.5 shrink-0 text-violet-500" strokeWidth={2} />
                {organizer.office_address}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export default OrganizerSpotlight;
