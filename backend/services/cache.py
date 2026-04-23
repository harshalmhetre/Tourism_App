"""
In-Memory Cache Service
Replaces Redis with a lightweight TTL-based in-memory cache.
Maintains the same public API so nothing else in the app needs to change.
"""

import json
import hashlib
import asyncio
import time
from typing import Optional, List, Dict, Any
from datetime import datetime
from config.settings import get_settings

settings = get_settings()


class CacheEntry:
    """A single cached item with expiry tracking."""

    def __init__(self, value: Any, ttl: Optional[int]):
        self.value = value
        self.expires_at: Optional[float] = (time.monotonic() + ttl) if ttl else None

    def is_expired(self) -> bool:
        if self.expires_at is None:
            return False
        return time.monotonic() > self.expires_at


class InMemoryCache:
    """
    Thread-safe in-memory cache with TTL support.

    Provides the same async interface that RedisCache did so callers in
    main.py, services/recommendation.py, and services/preview.py need
    zero changes.
    """

    def __init__(self):
        self._store: Dict[str, CacheEntry] = {}
        self._lock = asyncio.Lock()

    # ------------------------------------------------------------------
    # Lifecycle (kept for API compatibility with old Redis cache)
    # ------------------------------------------------------------------

    async def connect(self):
        """No-op — nothing to connect for in-memory cache."""
        pass

    async def close(self):
        """No-op — nothing to close."""
        pass

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _hash_key(self, data: Dict) -> str:
        serialized = json.dumps(data, sort_keys=True, default=str)
        return hashlib.md5(serialized.encode()).hexdigest()

    async def _set(self, key: str, value: Any, ttl: Optional[int]):
        async with self._lock:
            self._store[key] = CacheEntry(value, ttl)

    async def _get(self, key: str) -> Optional[Any]:
        async with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            if entry.is_expired():
                del self._store[key]
                return None
            return entry.value

    async def _delete(self, key: str):
        async with self._lock:
            self._store.pop(key, None)

    async def _delete_pattern(self, prefix: str):
        """Delete all keys that start with prefix."""
        async with self._lock:
            to_delete = [k for k in self._store if k.startswith(prefix)]
            for k in to_delete:
                del self._store[k]

    # ------------------------------------------------------------------
    # Candidate cache
    # ------------------------------------------------------------------

    async def cache_user_candidates(
        self,
        user_id: int,
        candidates: List[Dict],
        ttl: int = None,
    ):
        if ttl is None:
            ttl = settings.CACHE_TTL_CANDIDATES
        await self._set(f"candidates:user:{user_id}", candidates, ttl)

    async def get_user_candidates(self, user_id: int) -> Optional[List[Dict]]:
        return await self._get(f"candidates:user:{user_id}")

    async def invalidate_user_candidates(self, user_id: int):
        await self._delete(f"candidates:user:{user_id}")

    # ------------------------------------------------------------------
    # Recommendations cache
    # ------------------------------------------------------------------

    async def cache_recommendations(
        self,
        user_id: int,
        request_params: Dict,
        recommendations: List[Dict],
        ttl: int = None,
    ):
        if ttl is None:
            ttl = settings.CACHE_TTL_RECOMMENDATIONS
        params_hash = self._hash_key(request_params)
        key = f"recommendations:user:{user_id}:params:{params_hash}"
        cache_data = {
            "recommendations": recommendations,
            "cached_at": datetime.now().isoformat(),
            "request_params": request_params,
        }
        await self._set(key, cache_data, ttl)

    async def get_recommendations(
        self, user_id: int, request_params: Dict
    ) -> Optional[Dict]:
        params_hash = self._hash_key(request_params)
        key = f"recommendations:user:{user_id}:params:{params_hash}"
        return await self._get(key)

    # ------------------------------------------------------------------
    # YouTube videos cache
    # ------------------------------------------------------------------

    async def cache_youtube_videos(
        self,
        place_id: int,
        videos: List[Dict],
        ttl: int = None,
    ):
        if ttl is None:
            ttl = settings.CACHE_TTL_VIDEOS
        await self._set(f"youtube:place:{place_id}", videos, ttl)

    async def get_youtube_videos(self, place_id: int) -> Optional[List[Dict]]:
        return await self._get(f"youtube:place:{place_id}")

    # ------------------------------------------------------------------
    # Weather cache
    # ------------------------------------------------------------------

    async def cache_weather(
        self,
        place_id: int,
        weather_data: Dict,
        ttl: int = None,
    ):
        if ttl is None:
            ttl = settings.CACHE_TTL_WEATHER
        await self._set(f"weather:place:{place_id}", weather_data, ttl)

    async def get_weather(self, place_id: int) -> Optional[Dict]:
        return await self._get(f"weather:place:{place_id}")

    # ------------------------------------------------------------------
    # Route cache
    # ------------------------------------------------------------------

    async def cache_route(
        self,
        waypoints_hash: str,
        route_data: Dict,
        ttl: int = 86400,
    ):
        await self._set(f"route:{waypoints_hash}", route_data, ttl)

    async def get_route(self, waypoints_hash: str) -> Optional[Dict]:
        return await self._get(f"route:{waypoints_hash}")

    # ------------------------------------------------------------------
    # Embedding cache
    # ------------------------------------------------------------------

    async def cache_user_embedding(self, user_id: int, embedding: Any, ttl: int = 3600):
        await self._set(f"embedding:user:{user_id}", embedding, ttl)

    async def get_user_embedding(self, user_id: int) -> Optional[Any]:
        return await self._get(f"embedding:user:{user_id}")

    async def cache_place_embedding(self, place_id: int, embedding: Any, ttl: int = 86400):
        await self._set(f"embedding:place:{place_id}", embedding, ttl)

    async def get_place_embedding(self, place_id: int) -> Optional[Any]:
        return await self._get(f"embedding:place:{place_id}")

    # ------------------------------------------------------------------
    # Cleanup
    # ------------------------------------------------------------------

    async def clear_user_cache(self, user_id: int):
        """Remove all cached data for a specific user."""
        await self._delete(f"candidates:user:{user_id}")
        await self._delete(f"embedding:user:{user_id}")
        await self._delete_pattern(f"recommendations:user:{user_id}:")

    async def clear_all_cache(self):
        async with self._lock:
            self._store.clear()

    # ------------------------------------------------------------------
    # Stats
    # ------------------------------------------------------------------

    async def get_cache_stats(self) -> Dict[str, Any]:
        async with self._lock:
            total = len(self._store)
            expired = sum(1 for e in self._store.values() if e.is_expired())
        return {
            "total_keys": total,
            "expired_keys": expired,
            "live_keys": total - expired,
            "backend": "in-memory",
        }


# ---------------------------------------------------------------------------
# Global singleton
# ---------------------------------------------------------------------------
cache = InMemoryCache()


async def get_cache() -> InMemoryCache:
    """FastAPI dependency: returns the global cache instance."""
    return cache
