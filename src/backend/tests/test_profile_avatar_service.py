from io import BytesIO
from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import UUID

from app.services import profile_services as service


def test_upload_avatar_uses_service_role_storage_client(monkeypatch):
    storage_bucket = MagicMock()
    storage_bucket.get_public_url.return_value = (
        "https://example.supabase.co/storage/v1/object/public/avatars/avatar.png"
    )
    service_role_client = MagicMock()
    service_role_client.storage.from_.return_value = storage_bucket

    legacy_client = MagicMock()
    legacy_client.storage.from_.side_effect = AssertionError(
        "Avatar storage must not use the legacy Supabase client"
    )

    monkeypatch.setattr(
        service,
        "get_supabase",
        lambda: service_role_client,
        raising=False,
    )
    monkeypatch.setattr(service, "supabase", legacy_client)
    monkeypatch.setattr(service, "validate_avatar", lambda **_kwargs: "png")

    upload = MagicMock()
    upload.file = BytesIO(b"valid-image-content")
    upload.content_type = "image/png"

    current_user = SimpleNamespace(
        user_id=UUID("11111111-1111-1111-1111-111111111111"),
        avatar_url=None,
    )
    db = MagicMock()

    result = service.upload_avatar_service(upload, current_user, db)

    service_role_client.storage.from_.assert_called_with("avatars")
    storage_bucket.upload.assert_called_once()
    assert result.avatar_url == storage_bucket.get_public_url.return_value
    assert current_user.avatar_url == result.avatar_path
    db.commit.assert_called_once()
