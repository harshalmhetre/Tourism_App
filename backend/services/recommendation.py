"""
Recommendation Service — works with the simplified Place model
(category and crowd_level are plain strings, no enums).
"""

from typing import List, Dict, Tuple, Optional
from datetime import datetime
from pathlib import Path

import pandas as pd

from config.settings import get_settings
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database_models.postgres_model import User, Place, Interaction
from geoalchemy2.functions import ST_DWithin, ST_GeogFromText

from ml.collaborative import CollaborativeFilteringRecommender
from ml.content_based import ContentBasedRecommender
from ml.ranker import LambdaRankModel
from ml.re_ranking import ReRanker

settings = get_settings()


class RecommendationService:
    def __init__(self):
        self.cf_model      = None
        self.content_filter = None
        self.ranker        = None
        self.reranker      = ReRanker()
        self.models_loaded = False

    def load_models(self):
        if Path(settings.ALS_MODEL_PATH).exists():
            self.cf_model = CollaborativeFilteringRecommender()
            self.cf_model.load_model(settings.ALS_MODEL_PATH)

        if Path(settings.CONTENT_MODEL_PATH).exists():
            self.content_filter = ContentBasedRecommender()
            self.content_filter.load_model(settings.CONTENT_MODEL_PATH)

        if Path(settings.LAMBDARANK_MODEL_PATH).exists():
            self.ranker = LambdaRankModel()
            self.ranker.load(settings.LAMBDARANK_MODEL_PATH)

        self.models_loaded = True

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _place_to_dict(self, p: Place) -> Dict:
        """Convert a Place ORM object to a plain dict for ML pipelines."""
        return {
            "place_id":        p.place_id,
            "category":        p.category,            # plain string
            "tags":            p.tags or [],
            "city":            p.city,
            "avg_rating":      p.avg_rating or 0.0,
            "description":     p.description or "",
            "popularity_score": p.popularity_score or 0.0,
        }

    def _build_interactions_df(self, interactions) -> pd.DataFrame:
        """Always return a DataFrame with the correct columns even if empty."""
        cols = ["user_id", "place_id", "interaction_type", "timestamp"]
        if not interactions:
            return pd.DataFrame(columns=cols)
        return pd.DataFrame([
            {
                "user_id":          i.user_id,
                "place_id":         i.place_id,
                "interaction_type": i.interaction_type,   # plain string
                "timestamp":        i.timestamp,
            }
            for i in interactions
        ])

    # ------------------------------------------------------------------
    # Candidate generation
    # ------------------------------------------------------------------

    async def generate_candidates(
        self,
        db: AsyncSession,
        user_id: int,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        use_location_filter: bool = True,
    ) -> List[Dict]:

        # Fetch user
        result = await db.execute(select(User).where(User.user_id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            return []

        # Fetch interactions (safe — empty list is fine)
        interactions_result = await db.execute(
            select(Interaction).where(Interaction.user_id == user_id)
        )
        interactions = interactions_result.scalars().all()
        interactions_df = self._build_interactions_df(interactions)

        # Fetch places (optionally filtered by distance)
        places_query = select(Place)
        if use_location_filter and latitude and longitude:
            user_point = f"POINT({longitude} {latitude})"
            places_query = places_query.where(
                ST_DWithin(
                    Place.location,
                    ST_GeogFromText(user_point),
                    settings.DISTANCE_THRESHOLD_KM * 1000,
                )
            )

        places_result = await db.execute(places_query)
        places = places_result.scalars().all()

        if not places:
            return []

        places_df = pd.DataFrame([self._place_to_dict(p) for p in places])

        # Guard — should never be empty now, but just in case
        if places_df.empty or "place_id" not in places_df.columns:
            return []

        # ALS scores
        als_scores: Dict = {}
        if self.cf_model and self.models_loaded:
            try:
                als_scores = dict(
                    self.cf_model.get_recommendations(user_id=user_id, top_k=200)
                )
            except Exception as e:
                print("ALS error:", e)

        # Content-based scores
        content_scores: Dict = {}
        if self.content_filter and self.models_loaded:
            try:
                content_scores = dict(
                    self.content_filter.get_recommendations_for_user(
                        user_id=user_id,
                        interactions_df=interactions_df,
                        explicit_preferences={
                            "user_id":       user_id,
                            "preferences":   user.preferences or [],
                            "companion_type": user.companion_type or None,
                        },
                        place_df=places_df,
                        top_k=200,
                    )
                )
            except Exception as e:
                print("Content error:", e)

        candidates = []
        for pid in places_df["place_id"]:
            als     = als_scores.get(pid, 0.0)
            content = content_scores.get(pid, 0.0)
            candidates.append({
                "place_id":      pid,
                "als_score":     float(als),
                "content_score": float(content),
                "combined_score": 0.4 * als + 0.6 * content,
            })

        candidates.sort(key=lambda x: x["combined_score"], reverse=True)
        return candidates[: settings.CANDIDATE_POOL_SIZE]

    # ------------------------------------------------------------------
    # Ranking
    # ------------------------------------------------------------------

    async def rank_candidates(
        self,
        db: AsyncSession,
        user_id: int,
        candidates: List[Dict],
    ) -> List[Tuple[int, float]]:

        if not self.ranker or not self.models_loaded:
            return sorted(
                [(c["place_id"], c["combined_score"]) for c in candidates],
                key=lambda x: x[1],
                reverse=True,
            )

        user_result = await db.execute(select(User).where(User.user_id == user_id))
        user = user_result.scalar_one_or_none()
        if not user:
            return []

        user_features = {
            "age":            getattr(user, "age", 30),
            "companion_type": getattr(user, "companion_type", "solo"),
            "preferences":    getattr(user, "preferences", []) or [],
        }

        place_ids     = [c["place_id"] for c in candidates]
        places_result = await db.execute(select(Place).where(Place.place_id.in_(place_ids)))
        places        = {p.place_id: p for p in places_result.scalars().all()}

        ranking_input = []
        for c in candidates:
            p = places.get(c["place_id"])
            if not p:
                continue
            ranking_input.append({
                "place_id": c["place_id"],
                "place_features": {
                    "category":        p.category,
                    "tags":            p.tags or [],
                    "avg_rating":      p.avg_rating or 0.0,
                    "popularity_score": p.popularity_score or 0.0,
                },
                "als_score":     c["als_score"],
                "content_score": c["content_score"],
            })

        return self.ranker.rank_candidates(user_features, ranking_input)

    # ------------------------------------------------------------------
    # Build response list
    # ------------------------------------------------------------------

    async def _build_results(
        self,
        db: AsyncSession,
        ranked: List[Tuple[int, float]],
        limit: int,
        category_filter: Optional[List[str]] = None,
    ) -> List[Dict]:

        place_ids     = [pid for pid, _ in ranked]
        places_result = await db.execute(select(Place).where(Place.place_id.in_(place_ids)))
        places        = {p.place_id: p for p in places_result.scalars().all()}

        results = []
        for pid, score in ranked:
            p = places.get(pid)
            if not p:
                continue
            if category_filter and p.category.lower() not in [c.lower() for c in category_filter]:
                continue

            results.append({
                "place": {
                    "place_id":        p.place_id,
                    "name":            p.name,
                    "category":        p.category,
                    "city":            p.city,
                    "latitude":        p.latitude,
                    "longitude":       p.longitude,
                    "description":     p.description or "",
                    "tags":            p.tags or [],
                    "avg_rating":      p.avg_rating or 0.0,
                    "popularity_score": p.popularity_score or 0.0,
                },
                "score": float(score),
            })

            if len(results) >= limit:
                break

        return results

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def get_recommendations(
        self,
        db: AsyncSession,
        user_id: int,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        max_distance_km: Optional[float] = None,
        limit: int = 20,
        category_filter: Optional[List[str]] = None,
    ) -> Dict:

        candidates = await self.generate_candidates(
            db, user_id, latitude, longitude, use_location_filter=True
        )

        if not candidates:
            return {
                "user_id": user_id,
                "recommendations": [],
                "computed_at": datetime.now(),
                "cache_hit": False,
            }

        ranked  = await self.rank_candidates(db, user_id, candidates)
        results = await self._build_results(db, ranked, limit, category_filter)

        return {
            "user_id":         user_id,
            "recommendations": results,
            "computed_at":     datetime.now(),
            "cache_hit":       False,
        }

    async def get_fresh_recommendations(
        self,
        db: AsyncSession,
        user_id: int,
        limit: int = 20,
    ) -> Dict:
        """Refresh: run over ALL places, ignore location filter."""

        candidates = await self.generate_candidates(
            db, user_id, latitude=None, longitude=None, use_location_filter=False
        )

        if not candidates:
            return {
                "user_id": user_id,
                "recommendations": [],
                "computed_at": datetime.now(),
                "cache_hit": False,
            }

        ranked  = await self.rank_candidates(db, user_id, candidates)
        results = await self._build_results(db, ranked, limit)

        return {
            "user_id":         user_id,
            "recommendations": results,
            "computed_at":     datetime.now(),
            "cache_hit":       False,
        }


# Global instance
recommendation_service = RecommendationService()
