"""GhostRoute AI - Vercel Service Root Entrypoint
Exposes the FastAPI ASGI application instance for Vercel deployment.
"""

from backend.main import app

__all__ = ["app"]
