"""Security helpers: rate limits and response headers (same approach as Claude Alerts).

Limits live in memory, so they reset when the app restarts. Their job is to make password guessing slow.
"""
import threading
import time
from collections import defaultdict, deque


class Limiter:
    """Sliding window: at most `limit` events per `window` seconds for each key."""

    def __init__(self, limit, window):
        self.limit, self.window = limit, window
        self.hits = defaultdict(deque)
        self.lock = threading.Lock()

    def _trim(self, q, now):
        while q and now - q[0] > self.window:
            q.popleft()

    def blocked(self, key):
        """Seconds until the key may try again (0 = allowed). Doesn't record anything."""
        now = time.time()
        with self.lock:
            q = self.hits[key]
            self._trim(q, now)
            return int(self.window - (now - q[0])) + 1 if len(q) >= self.limit else 0

    def hit(self, key):
        with self.lock:
            self.hits[key].append(time.time())

    def allow(self, key):
        if self.blocked(key):
            return False
        self.hit(key)
        return True

    def reset(self, key):
        with self.lock:
            self.hits.pop(key, None)


# Wrong passwords: 5 per username+address per 15 min, and 20 per network address per 15 min.
login_user = Limiter(5, 15 * 60)
login_ip = Limiter(20, 15 * 60)
# New profiles: 3 per network address per hour.
signup_ip = Limiter(3, 60 * 60)
# Sign-up's "is this username free?" check (runs as you type).
username_ip = Limiter(40, 60)


def wait_text(seconds):
    m = max(1, round(seconds / 60))
    return f"{m} minute{'s' if m != 1 else ''}"


CSP = "; ".join([
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "connect-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
])

HEADERS = {
    "Content-Security-Policy": CSP,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "same-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Cross-Origin-Opener-Policy": "same-origin",
}
