from typing import Optional

from fastapi import Depends, Header, HTTPException, status
from supabase_auth.types import User

from app.core.supabase_client import get_supabase


def _extract_bearer_token(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None
    return token


async def get_current_user(
    authorization: Optional[str] = Header(default=None),
) -> Optional[User]:
    """Resolve the caller's Supabase user from the Authorization header, if any.

    Returns None when there is no token or the token is invalid — callers that
    require auth should use `require_current_user` instead.
    """
    token = _extract_bearer_token(authorization)
    if not token:
        return None

    try:
        response = get_supabase().auth.get_user(token)
    except Exception:
        return None

    return response.user if response else None


async def require_current_user(
    user: Optional[User] = Depends(get_current_user),
) -> User:
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bạn cần đăng nhập để thực hiện thao tác này.",
        )
    return user
