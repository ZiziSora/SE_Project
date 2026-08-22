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

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-36px_rgba(33,24,44,0.35)]">
      <h2 className="text-xl font-semibold text-[#21182c]">Ban tổ chức</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">
        Đơn vị phụ trách và hỗ trợ thông tin sự kiện.
      </p>

      <div className="mt-5 flex items-center gap-3">
        <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-base font-semibold text-white">
          {organizer?.avatar_url ? (
            <img
              src={organizer.avatar_url}
              alt={`Logo ${organizerName}`}
              className="size-full object-cover transition-transform duration-700 ease-out hover:scale-105"
            />
          ) : (
            <span>{getInitials(organizerName)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-700">
            <ShieldCheck className="size-3.5" />
            Tổ chức bởi
          </div>
          <p className="mt-0.5 truncate text-base font-semibold text-[#21182c]">{organizerName}</p>
          <p className="truncate text-sm text-slate-500">
            {organizer?.organization_type || "Đơn vị thuộc trường"}
          </p>
        </div>
      </div>

      {organizer?.description && (
        <p className="mt-4 text-sm leading-6 text-slate-600">
          {organizer.description}
        </p>
      )}

      {(organizer?.department_name ||
        organizer?.contact_phone ||
        organizer?.office_address) && (
        <div className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm text-slate-600">
          {organizer?.department_name && (
            <span className="flex items-center gap-1.5">
              <Building2 className="size-3.5 text-violet-600" />
              {organizer.department_name}
            </span>
          )}
          {organizer?.contact_phone && (
            <a
              href={`tel:${organizer.contact_phone}`}
              className="flex items-center gap-1.5 font-medium text-slate-700 hover:text-violet-700"
            >
              <Phone className="size-3.5 text-violet-600" />
              {organizer.contact_phone}
            </a>
          )}
          {organizer?.office_address && (
            <span className="flex items-center gap-1.5">
              <MapPinned className="size-3.5 text-violet-600" />
              {organizer.office_address}
            </span>
          )}
        </div>
      )}
    </article>
  );
}

export default OrganizerSpotlight;
