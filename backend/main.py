"""
Tourism Recommendation System — main FastAPI application.

Redis has been fully removed. Caching is now handled by the in-memory
InMemoryCache in services/cache.py (same async API, drop-in replacement).

Notable change: POST /recommendations/refresh now returns a fresh set of
recommendations computed against ALL places in the database (no location
filter), giving the user a broad profile-driven refresh.
"""

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import List, Optional
import uvicorn

from config.settings import get_settings
from database.connection import get_db, init_db, close_db
from database_models.postgres_model import User, Place, Interaction
from schema.api_response_schema import (
    Token, UserLogin, UserRegister, UserResponse,
    RecommendationRequest, RecommendationResponse,
    InteractionCreate, InteractionResponse, InteractionTypeSchema,
    RouteRequest, RouteResponse, YouTubePreviewResponse, YouTubeVideo,
    WeatherResponse,
)
from services.cache import cache, get_cache
from services.recommendation import recommendation_service
from services.routing import routing_service
from services.preview import youtube_service
from services.weather_alerts import weather_service

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from services.auth import AuthService, get_current_active_user

settings = get_settings()


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup / shutdown."""
    print("Starting up Tourism Recommendation System...")

    await init_db()
    print("✓ Database initialized")

    # In-memory cache — connect() is a no-op, kept for interface compatibility
    await cache.connect()
    print("✓ In-memory cache ready (Redis removed)")

    recommendation_service.load_models()
    print("✓ ML models loaded")

    yield

    print("Shutting down...")
    await cache.close()
    await close_db()
    print("✓ Cleanup complete")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# AUTH
# ---------------------------------------------------------------------------

@app.post("/auth/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserRegister,
    db: AsyncSession = Depends(get_db),
):
    """Register a new user."""
    result = await db.execute(
        select(User).where(
            (User.username == user_data.username) | (User.email == user_data.email)
        )
    )
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered",
        )

    password_hash = AuthService.hash_password(user_data.password)

    new_user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=password_hash,
        age=user_data.age,
        gender=user_data.gender,
        budget=user_data.budget,
        preferred_crowd_level=user_data.preferred_crowd_level,
        companion_type=user_data.companion_type,
        preferences=user_data.preferences,
        created_at=datetime.now(),
        is_active=True,
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    access_token = AuthService.create_access_token(data={"sub": new_user.username})

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.from_orm(new_user),
    )


@app.post("/auth/login", response_model=Token)
async def login(
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db),
):
    """Login and receive a JWT token."""
    user = await AuthService.authenticate_user(
        db, credentials.username, credentials.password
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    access_token = AuthService.create_access_token(data={"sub": user.username})

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.from_orm(user),
    )


# ---------------------------------------------------------------------------
# RECOMMENDATIONS
# ---------------------------------------------------------------------------

@app.post("/recommendations", response_model=RecommendationResponse)
async def get_recommendations(
    request: RecommendationRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get personalized recommendations for a user.

    Uses the full ML pipeline:
    1. ALS (collaborative filtering) + Content-based for candidate generation
    2. LambdaRank for ranking
    3. Optional category filter applied after ranking
    """
    result = await recommendation_service.get_recommendations(
        db=db,
        user_id=current_user.user_id,
        latitude=request.latitude,
        longitude=request.longitude,
        max_distance_km=request.max_distance_km,
        limit=request.limit,
        category_filter=request.category_filter,
    )
    return result


@app.post("/recommendations/refresh", response_model=RecommendationResponse)
async def refresh_recommendations(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Force-refresh recommendations.

    Runs the complete ML pipeline against ALL places in the database
    (no location filter).  This returns broad, profile-driven picks based
    solely on the user's preferences and interaction history — useful when
    the user wants to discover new places beyond their current vicinity.
    """
    result = await recommendation_service.get_fresh_recommendations(
        db=db,
        user_id=current_user.user_id,
    )
    return result


# ---------------------------------------------------------------------------
# INTERACTIONS
# ---------------------------------------------------------------------------

@app.post("/interactions", response_model=InteractionResponse, status_code=status.HTTP_201_CREATED)
async def create_interaction(
    interaction: InteractionCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    cache_service=Depends(get_cache),
):
    """Record a user interaction with a place."""

    implicit_scores = {
        InteractionTypeSchema.CLICK: 0.1,
        InteractionTypeSchema.PREVIEW_VIEWED: 0.3,
        InteractionTypeSchema.SEARCH: 0.4,
        InteractionTypeSchema.SAVE: 0.7,
        InteractionTypeSchema.ROUTE_REQUESTED: 0.8,
        InteractionTypeSchema.SKIP: 0.0,
    }

    new_interaction = Interaction(
        user_id=current_user.user_id,
        place_id=interaction.place_id,
        interaction_type=interaction.interaction_type,
        implicit_score=implicit_scores.get(interaction.interaction_type, 0.0),
        session_id=interaction.session_id,
        timestamp=datetime.now(),
    )

    db.add(new_interaction)
    await db.commit()
    await db.refresh(new_interaction)

    # Invalidate in-memory candidate cache for this user
    await cache_service.invalidate_user_candidates(current_user.user_id)

    return new_interaction


# ---------------------------------------------------------------------------
# YOUTUBE VIDEOS
# ---------------------------------------------------------------------------

@app.get("/places/{place_id}/videos", response_model=YouTubePreviewResponse)
async def get_place_videos(
    place_id: int,
    max_results: int = 5,
    db: AsyncSession = Depends(get_db),
    cache_service=Depends(get_cache),
):
    """Get YouTube video previews for a place (in-memory cached)."""

    cached_videos = await cache_service.get_youtube_videos(place_id)
    if cached_videos:
        result = await db.execute(select(Place).where(Place.place_id == place_id))
        place = result.scalar_one_or_none()
        return YouTubePreviewResponse(
            place_id=place_id,
            place_name=place.name if place else "",
            videos=[YouTubeVideo(**v) for v in cached_videos],
            total_results=len(cached_videos),
        )

    result = await db.execute(select(Place).where(Place.place_id == place_id))
    place = result.scalar_one_or_none()

    if not place:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Place not found",
        )

    videos = await youtube_service.search_place_videos(
        place_name=place.name,
        city=place.city,
        latitude=place.latitude,
        longitude=place.longitude,
        max_results=max_results,
    )

    if videos:
        await cache_service.cache_youtube_videos(place_id, [v.dict() for v in videos])

    return YouTubePreviewResponse(
        place_id=place_id,
        place_name=place.name,
        videos=videos,
        total_results=len(videos),
    )


# ---------------------------------------------------------------------------
# ROUTES
# ---------------------------------------------------------------------------

@app.post("/routes", response_model=RouteResponse)
async def get_route(
    route_request: RouteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Get an optimized route between places."""

    waypoints = route_request.waypoints
    place_ids = [w.place_id for w in waypoints]

    result = await db.execute(select(Place).where(Place.place_id.in_(place_ids)))
    places = result.scalars().all()
    places_dict = {p.place_id: p for p in places}

    waypoint_coords = []
    waypoint_names = []
    places_data = []

    for wp in sorted(waypoints, key=lambda x: x.order):
        place = places_dict.get(wp.place_id)
        if place:
            waypoint_coords.append((wp.longitude, wp.latitude))
            waypoint_names.append(place.name)
            places_data.append({
                "popularity_score": place.popularity_score,
                "avg_rating": place.avg_rating,
            })

    if len(waypoint_coords) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least 2 valid waypoints required",
        )

    if route_request.optimize and len(waypoint_coords) > 2:
        start = waypoint_coords[0]
        end = waypoint_coords[-1]
        intermediate = waypoint_coords[1:-1]
        intermediate_data = places_data[1:-1]

        optimized_order = await routing_service.optimize_route(
            start_point=start,
            end_point=end,
            intermediate_points=intermediate,
            places_data=intermediate_data,
        )

        optimized_coords = [start] + [intermediate[i] for i in optimized_order] + [end]
        optimized_names = (
            [waypoint_names[0]]
            + [waypoint_names[i + 1] for i in optimized_order]
            + [waypoint_names[-1]]
        )
        optimized_waypoints = [waypoints[0]]
        for i in optimized_order:
            optimized_waypoints.append(waypoints[i + 1])
        optimized_waypoints.append(waypoints[-1])

        waypoint_coords = optimized_coords
        waypoint_names = optimized_names
        waypoints = optimized_waypoints

    route_data = await routing_service.get_route(waypoint_coords)

    if not route_data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to calculate route",
        )

    routes = route_data.get("routes", [])
    if not routes:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No route found",
        )

    route = routes[0]
    total_distance = route.get("distance", 0) / 1000.0
    total_duration = route.get("duration", 0) / 60.0

    segments = routing_service.extract_route_segments(route_data, waypoint_names)

    start_lat = waypoint_coords[0][1]
    start_lon = waypoint_coords[0][0]
    end_lat = waypoint_coords[-1][1]
    end_lon = waypoint_coords[-1][0]

    map_url = (
        f"https://www.openstreetmap.org/directions?"
        f"engine=osrm_car&route={start_lat}%2C{start_lon}%3B{end_lat}%2C{end_lon}"
    )

    return RouteResponse(
        total_distance_km=total_distance,
        total_duration_minutes=total_duration,
        optimized_waypoints=waypoints,
        segments=segments,
        map_url=map_url,
    )


# ---------------------------------------------------------------------------
# HEALTH CHECK
# ---------------------------------------------------------------------------

@app.get("/health")
async def health_check(cache_service=Depends(get_cache)):
    stats = await cache_service.get_cache_stats()
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "cache": stats,
    }


# ---------------------------------------------------------------------------

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
