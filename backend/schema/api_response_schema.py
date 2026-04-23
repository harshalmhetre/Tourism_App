"""
API Request / Response schemas.

Simplified to match the new flat-string model (no CategoryEnum / CrowdLevelEnum).
"""
import enum
from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Optional, Any
from datetime import datetime


# ---------------------------------------------------------------------------
# Interaction type — the only enum we still need
# ---------------------------------------------------------------------------

class InteractionTypeSchema(str, enum.Enum):
    CLICK           = "click"
    PREVIEW_VIEWED  = "preview_viewed"
    ROUTE_REQUESTED = "route_requested"
    SAVE            = "save"
    SKIP            = "skip"
    SEARCH          = "search"


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class UserLogin(BaseModel):
    username: str
    password: str


class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)
    age: Optional[int] = Field(None, ge=13, le=120)
    gender: Optional[str] = None
    budget: Optional[float] = None
    preferred_crowd_level: Optional[str] = None   # "HIGH" / "MEDIUM" / "LOW"
    companion_type: Optional[str] = None          # "solo" / "couple" / etc.
    preferences: Optional[List[str]] = []


class UserResponse(BaseModel):
    user_id: int
    username: str
    email: str
    age: Optional[int] = None
    gender: Optional[str] = None
    companion_type: Optional[str] = None
    preferences: Optional[List[str]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

    class Config:
        from_attributes = True


class TokenData(BaseModel):
    username: Optional[str] = None


# ---------------------------------------------------------------------------
# Places
# ---------------------------------------------------------------------------

class PlaceResponse(BaseModel):
    place_id: int
    name: str
    category: str
    city: str
    latitude: float
    longitude: float
    description: Optional[str] = None
    tags: Optional[List[str]] = []
    avg_rating: float
    popularity_score: float

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Recommendations
# ---------------------------------------------------------------------------

class RecommendationRequest(BaseModel):
    user_id: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    max_distance_km: Optional[float] = 100.0
    limit: Optional[int] = 20
    category_filter: Optional[List[str]] = None


class RecommendedPlace(BaseModel):
    place: PlaceResponse


class RecommendationResponse(BaseModel):
    user_id: int
    recommendations: List[RecommendedPlace]
    computed_at: datetime
    cache_hit: bool = False


# ---------------------------------------------------------------------------
# Interactions
# ---------------------------------------------------------------------------

class InteractionCreate(BaseModel):
    place_id: int
    interaction_type: InteractionTypeSchema
    session_id: Optional[str] = None


class InteractionResponse(BaseModel):
    interaction_id: int
    user_id: int
    place_id: int
    interaction_type: str
    implicit_score: float
    timestamp: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

class RouteWaypoint(BaseModel):
    place_id: int
    latitude: float
    longitude: float
    name: str
    order: int
    visit_duration_minutes: int
    popularity_score: float


class RouteRequest(BaseModel):
    user_id: int
    waypoints: List[RouteWaypoint]
    optimize: bool = True
    transport_mode: str = "driving"

    @validator("waypoints")
    def validate_waypoints(cls, v):
        if len(v) < 2:
            raise ValueError("At least 2 waypoints required")
        if len(v) > 12:
            raise ValueError("Maximum 12 waypoints allowed")
        return v


class RouteSegment(BaseModel):
    from_place: str
    to_place: str
    distance_km: float
    duration_minutes: float
    traffic_signals: int = 0
    geometry: List[List[float]]


class RouteResponse(BaseModel):
    total_distance_km: float
    total_duration_minutes: float
    total_traffic_signals: int = 0
    optimized_waypoints: List[RouteWaypoint]
    segments: List[RouteSegment]
    map_url: Optional[str] = None


# ---------------------------------------------------------------------------
# YouTube
# ---------------------------------------------------------------------------

class YouTubeVideo(BaseModel):
    video_id: str
    title: str
    description: str
    thumbnail_url: str
    channel_title: str
    published_at: datetime
    view_count: Optional[int] = None
    duration: Optional[str] = None


class YouTubePreviewResponse(BaseModel):
    place_id: int
    place_name: str
    videos: List[YouTubeVideo]
    total_results: int


# ---------------------------------------------------------------------------
# Weather (kept for compatibility, endpoint is optional)
# ---------------------------------------------------------------------------

class WeatherCondition(BaseModel):
    temperature: float
    feels_like: float
    humidity: int
    description: str
    icon: str
    wind_speed: float


class WeatherAlert(BaseModel):
    event: str
    severity: str
    description: str
    start_time: datetime
    end_time: datetime


class WeatherForecast(BaseModel):
    date: datetime
    temperature_max: float
    temperature_min: float
    description: str
    icon: str
    precipitation_probability: Optional[float] = None


class WeatherResponse(BaseModel):
    place_id: int
    place_name: str
    city: str
    current: WeatherCondition
    alerts: List[WeatherAlert] = []
    forecast: Optional[List[WeatherForecast]] = None
    cached: bool = False
