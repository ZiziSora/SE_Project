/* =========================================================
   Event Description Component
   ========================================================= */
export function EventDescription({ text }) {
  return (
    <div className="bg-[#EEE8F9] rounded-2xl px-6 md:px-8 py-7 text-[15px] leading-relaxed text-gray-700 mb-7 whitespace-pre-line">
      {text}
    </div>
  );
}

export default EventDescription;
