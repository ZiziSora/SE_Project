import os
import sys
from pathlib import Path

# app.core.config raises RuntimeError at import time if these are missing.
# Set harmless dummy values before any `app.*` module is imported so unit
# tests never need a real backend/.env or a live Supabase project.
os.environ.setdefault("SUPABASE_URL", "http://localhost:54321")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")

BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))
