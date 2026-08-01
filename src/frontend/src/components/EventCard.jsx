export default function EventCard({ image, badgeText, title, faculty, date, location, isFeatured, role = 'student' }) {
  // Logic kiểm tra vai trò được đặt ngay đầu hàm
  const isOrganizer = role === 'organizer';

  return (
    <div
      className={`
        bg-white rounded-2xl overflow-hidden flex flex-col transition-all duration-300 group
        ${isFeatured
          ? 'border-2 border-purple-300 shadow-lg shadow-purple-100 hover:shadow-xl hover:shadow-purple-200 hover:-translate-y-1'
          : 'border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5'
        }
      `}
    >
      {/* Image */}
      <div className={`relative overflow-hidden ${isFeatured ? 'h-48' : 'h-40'}`}>
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            e.target.src = `https://picsum.photos/seed/${encodeURIComponent(title)}/400/300`;
          }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>

        {/* Badge */}
        {badgeText && (
          <span
            className="absolute top-2.5 left-2.5 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-md backdrop-blur-sm"
            style={{ backgroundColor: '#6D28D9' }}
          >
            {badgeText}
          </span>
        )}

        {/* Featured indicator */}
        {isFeatured && (
          <span className="absolute top-2.5 right-2.5 bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-2 py-0.5 rounded-full border border-white/30">
            ✨ Nổi bật
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        {/* Title */}
        <h3 className={`font-bold text-gray-800 leading-snug line-clamp-2 ${isFeatured ? 'text-base' : 'text-sm'}`}>
          {title}
        </h3>

        {/* Faculty */}
        <p className="text-xs text-gray-400 font-medium">{faculty}</p>

        {/* Date & Location */}
        <div className="flex flex-col gap-1 mt-auto pt-1">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#6D28D9' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="truncate">{date}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#6D28D9' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">{location}</span>
          </div>
        </div>

        {/* Action Buttons ĐÃ ĐƯỢC CHUẨN HÓA */}
        <div className="flex gap-2 mt-3">
          <button
            className={`py-2 px-3 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition ${isOrganizer ? 'w-full' : 'flex-1'}`}
          >
            Xem thông tin
          </button>

          {/* Nếu KHÔNG PHẢI organizer thì mới hiển thị nút Đăng Ký */}
          {!isOrganizer && (
            <button
              className="flex-1 py-2 px-3 text-xs font-semibold rounded-lg text-white transition shadow-sm"
              style={{ backgroundColor: '#7C3AED' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#6D28D9'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#7C3AED'}
            >
              Đăng ký
            </button>
          )}
        </div>
      </div>
    </div>
  );
}