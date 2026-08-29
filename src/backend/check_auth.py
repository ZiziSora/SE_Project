"""Chẩn đoán lỗi "Dịch vụ xác thực đang tạm thời không khả dụng".

Thông báo đó là HTTP 503 do `login_service` bắt mọi Exception lạ khi gọi
Supabase Auth. Nó KHÔNG có nghĩa là sai mật khẩu — nghĩa là backend không nói
chuyện được với Supabase Auth. Script này in ra lỗi thật.

Chạy trong thư mục src/backend, bằng đúng venv của dự án:

    venv\\Scripts\\python check_auth.py
    venv\\Scripts\\python check_auth.py email@example.com matkhau   # thử đăng nhập luôn
"""

import os
import socket
import sys
import traceback
from urllib.parse import urlparse

from dotenv import load_dotenv

load_dotenv()

URL = os.getenv("SUPABASE_URL")
KEYS = {
    "SUPABASE_SECRET_KEY (client `supabase` dùng để đăng nhập)": os.getenv(
        "SUPABASE_SECRET_KEY"
    ),
    "SUPABASE_PUBLISHED_KEY (khoá công khai)": os.getenv(
        "SUPABASE_PUBLISHED_KEY"
    ),
}


def show(label, ok, extra=""):
    print(f"[{'OK ' if ok else 'LOI'}] {label}{(' — ' + extra) if extra else ''}")


print("=" * 70)
print("1. Biến môi trường trong backend/.env")
print("=" * 70)
show("SUPABASE_URL", bool(URL), URL or "THIẾU")
for name, value in KEYS.items():
    show(name, bool(value), f"{len(value)} ký tự" if value else "THIẾU")
show("DATABASE_URL", bool(os.getenv("DATABASE_URL")))

if not URL:
    sys.exit("\nThiếu SUPABASE_URL — dừng.")

host = urlparse(URL).hostname
print()
print("=" * 70)
print(f"2. Phân giải tên miền {host}")
print("=" * 70)
try:
    print("   ->", socket.gethostbyname(host))
    show("DNS", True)
except Exception as error:  # noqa: BLE001
    show("DNS", False, f"{type(error).__name__}: {error}")
    print("\n   >>> Không phân giải được tên miền. Hai khả năng lớn nhất:")
    print("       - Project Supabase đã bị PAUSE (gói free tự pause khi lâu")
    print("         không dùng) → vào https://supabase.com/dashboard bấm Restore.")
    print("       - Máy đang mất mạng / bị chặn bởi firewall, VPN, mạng trường.")
    sys.exit(1)

print()
print("=" * 70)
print("3. Gọi thẳng Supabase Auth (/auth/v1/health)")
print("=" * 70)
try:
    import httpx

    resp = httpx.get(f"{URL}/auth/v1/health", timeout=15)
    show("HTTP", resp.status_code == 200, f"{resp.status_code} {resp.text[:200]}")
except Exception:  # noqa: BLE001
    show("HTTP", False)
    traceback.print_exc()

print()
print("=" * 70)
print("4. Tạo client Supabase như backend đang làm")
print("=" * 70)
try:
    from supabase import create_client

    client = create_client(URL, os.getenv("SUPABASE_SECRET_KEY"))
    show("create_client", True)
except Exception:  # noqa: BLE001
    show("create_client", False)
    traceback.print_exc()
    sys.exit(1)

if len(sys.argv) >= 3:
    email, password = sys.argv[1], sys.argv[2]
    print()
    print("=" * 70)
    print(f"5. Thử đăng nhập bằng {email}")
    print("=" * 70)
    try:
        result = client.auth.sign_in_with_password(
            {"email": email.strip().lower(), "password": password}
        )
        show("sign_in_with_password", result.session is not None)
        if result.user:
            print("   user_id:", result.user.id)
            print("   email_confirmed_at:", result.user.email_confirmed_at)
    except Exception as error:  # noqa: BLE001
        show("sign_in_with_password", False, type(error).__name__)
        traceback.print_exc()
        print()
        print("   >>> ĐÂY chính là lỗi bị nuốt thành thông báo 503 trên giao diện.")
else:
    print()
    print("Muốn thử đăng nhập luôn thì chạy lại kèm email và mật khẩu:")
    print("   venv\\Scripts\\python check_auth.py email@example.com matkhau")
