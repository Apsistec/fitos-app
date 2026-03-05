"""Rate limiting configuration using slowapi.

Import `limiter` into route modules and apply with @limiter.limit("N/period").
The limiter instance is also registered in main.py as app.state.limiter.
"""

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


def _get_rate_limit_key(request: Request) -> str:
    """Use JWT user_id when available, fall back to remote IP."""
    user_id = getattr(request.state, "user_id", None)
    return user_id or get_remote_address(request)


limiter = Limiter(key_func=_get_rate_limit_key)
