import { DetailItem } from "./DetailItem";

/* =========================================================
   Event Details Grid Component
   ========================================================= */
export function EventDetails({ details }) {
  return (
    <div className="bg-[#EEE8F9] rounded-2xl px-6 md:px-8 py-7 grid grid-cols-1 md:grid-cols-2 gap-x-14 gap-y-6 mb-6">
      {details.map((item, i) => (
        <DetailItem key={i} {...item} />
      ))}
    </div>
  );
}

export default EventDetails;
