import base64

import pytest
from fastapi import HTTPException

from app.schemas.auth import OrganizerProofFile
from app.services.auth_services import decode_organizer_proofs


def test_decode_organizer_proofs_accepts_supported_pdf():
    content = b"sample organizer proof"
    proof = OrganizerProofFile(
        filename="verification.pdf",
        content_type="application/pdf",
        content_base64=base64.b64encode(content).decode("ascii"),
    )

    decoded = decode_organizer_proofs([proof])

    assert len(decoded) == 1
    assert decoded[0].content == content
    assert decoded[0].extension == ".pdf"
    assert decoded[0].content_type == "application/pdf"


def test_decode_organizer_proofs_rejects_invalid_base64():
    proof = OrganizerProofFile(
        filename="verification.pdf",
        content_type="application/pdf",
        content_base64="not-valid-base64",
    )

    with pytest.raises(HTTPException) as exc_info:
        decode_organizer_proofs([proof])

    assert exc_info.value.status_code == 400


def test_decode_organizer_proofs_rejects_oversized_file():
    content = b"x" * (5 * 1024 * 1024 + 1)
    proof = OrganizerProofFile(
        filename="large.pdf",
        content_type="application/pdf",
        content_base64=base64.b64encode(content).decode("ascii"),
    )

    with pytest.raises(HTTPException) as exc_info:
        decode_organizer_proofs([proof])

    assert exc_info.value.status_code == 413
