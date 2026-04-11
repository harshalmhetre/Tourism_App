from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class InteractionTypeSchema(str, Enum):
    CLICK = "click"
    PREVIEW_VIEWED = "preview_viewed"
    ROUTE_REQUESTED = "route_requested"
    SAVE = "save"
    SKIP = "skip"
    SEARCH = "search"
    BOOKING = "booking"
    CHECK_IN = "check_in"


class CompanionTypeSchema(str, Enum):
    SOLO = "solo"
    COUPLE = "couple"
    FAMILY = "family"
    FRIENDS = "friends"
    BUSINESS = "business"


class CrowdLevelSchema(str, Enum):
    QUIET = "quiet"
    MODERATE = "moderate"
    BUSY = "busy"
    VERY_BUSY = "very_busy"


# User Schemas
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    age: Optional[int] = None
    gender: Optional[str] = None
    #budget: Optional[str] = "medium"
    #preferred_crowd_level: Optional[CrowdLevelSchema] = None
    companion_type: Optional[CompanionTypeSchema] = None
    preferences: Optional[List[str]] = []


class UserUpdate(BaseModel):
    age: Optional[int] = None
    gender: Optional[str] = None
    #budget: Optional[str] = None
    #preferred_crowd_level: Optional[CrowdLevelSchema] = None
    companion_type: Optional[CompanionTypeSchema] = None
    preferences: Optional[List[str]] = None
    current_latitude: Optional[float] = None
    current_longitude: Optional[float] = None


class UserResponse(BaseModel):
    user_id: int
    username: str
    email: str
    age: Optional[int]
    gender: Optional[str]
    # budget: Optional[str]
    # preferred_crowd_level: Optional[CrowdLevelSchema]
    companion_type: Optional[CompanionTypeSchema]
    preferences: Optional[List[str]]
    created_at: datetime
    
    class Config:
        from_attributes = True


# Place Schemas
class PlaceBase(BaseModel):
    name: str
    category: str
    city: str
    latitude: float
    longitude: float
    description: Optional[str] = None
    tags: Optional[List[str]] = []
    # avg_cost: Optional[float] = None
    # crowd_level: Optional[CrowdLevelSchema] = None


class PlaceResponse(BaseModel):
    place_id: int
    name: str
    category: str
    city: str
    latitude: float
    longitude: float
    description: Optional[str]
    tags: Optional[List[str]]
    # avg_cost: Optional[float]
    avg_rating: float
    # crowd_level: Optional[CrowdLevelSchema]
    popularity_score: float
    # images: Optional[List[str]]
    # cover_image: Optional[str]
    # distance_km: Optional[float] = None  # Distance from user
    
    class Config:
        from_attributes = True


# Interaction Schemas
class InteractionCreate(BaseModel):
    place_id: int
    interaction_type: InteractionTypeSchema
    session_id: Optional[str] = None


class InteractionResponse(BaseModel):
    interaction_id: int
    user_id: int
    place_id: int
    interaction_type: InteractionTypeSchema
    implicit_score: float
    timestamp: datetime
    
    class Config:
        from_attributes = True


# # Review Schemas
# class ReviewCreate(BaseModel):
#     place_id: int
#     rating: float = Field(..., ge=0.0, le=5.0)
#     review_text: Optional[str] = None


# class ReviewResponse(BaseModel):
#     review_id: int
#     user_id: int
#     place_id: int
#     rating: float
#     review_text: Optional[str]
#     created_at: datetime
#     helpful_count: int
    
#     class Config:
#         from_attributes = True


# Recommendation Schemas
class RecommendationRequest(BaseModel):
    user_id: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    max_distance_km: Optional[float] = 100.0
    limit: Optional[int] = 20
    category_filter: Optional[List[str]] = None


class RecommendedPlace(BaseModel):
    place: PlaceResponse
    #score: float
    # ncf_score: Optional[float] = None
    # content_score: Optional[float] = None
    # rank_score: Optional[float] = None
    # distance_km: Optional[float] = None
    # explanation: Optional[str] = None


class RecommendationResponse(BaseModel):
    user_id: int
    recommendations: List[RecommendedPlace]
    computed_at: datetime
    cache_hit: bool = False


# YouTube Preview Schemas
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


# # Route Schemas
# class RouteWaypoint(BaseModel):
#     place_id: int
#     latitude: float
#     longitude: float
#     name: str
#     order: int
#     visit_duration_minutes:int
#     popularity_score:int




# class RouteRequest(BaseModel):
#     user_id: int
#     waypoints: List[RouteWaypoint]
#     optimize: bool = True  # Tourist-optimized routing
#     transport_mode:str
    
#     @validator('waypoints')
#     def validate_waypoints(cls, v):
#         if len(v) < 2:
#             raise ValueError("At least 2 waypoints required")
#         if len(v) > 10:
#             raise ValueError("Maximum 10 waypoints allowed")
#         return v


# class RouteSegment(BaseModel):
#     from_place: str
#     to_place: str
#     distance_km: float
#     duration_minutes: float
#     geometry: List[List[float]]  # LineString coordinates


# class RouteResponse(BaseModel):
#     total_distance_km: float
#     total_duration_minutes: float
#     optimized_waypoints: List[RouteWaypoint]
#     segments: List[RouteSegment]
#     map_url: Optional[str] = None

from pydantic import BaseModel, validator
from typing import List, Optional

class RouteWaypoint(BaseModel):
    place_id: int
    latitude: float
    longitude: float
    name: str
    order: int
    visit_duration_minutes: int
    popularity_score: int

class RouteRequest(BaseModel):
    user_id: int
    # Logic tip: Treat the first waypoint as Start and last as End
    waypoints: List[RouteWaypoint]
    optimize: bool = True
    transport_mode: str = "driving" # driving, walking, cycling
    
    @validator('waypoints')
    def validate_waypoints(cls, v):
        if len(v) < 2:
            raise ValueError("At least 2 waypoints required (Start and End)")
        if len(v) > 12: # Increased slightly to allow Start + 10 stops + End
            raise ValueError("Maximum 10 intermediate waypoints allowed")
        return v

class RouteSegment(BaseModel):
    from_place: str
    to_place: str
    distance_km: float
    duration_minutes: float
    traffic_signals: int = 0  # Added to match our new service capability
    geometry: List[List[float]] 

class RouteResponse(BaseModel):
    total_distance_km: float
    total_duration_minutes: float
    total_traffic_signals: int = 0 # Summary for the whole trip
    optimized_waypoints: List[RouteWaypoint]
    segments: List[RouteSegment]
    map_url: Optional[str] = None

    
# Weather Schemas
class WeatherAlert(BaseModel):
    event: str
    severity: str
    description: str
    start_time: datetime
    end_time: datetime


class WeatherCondition(BaseModel):
    temperature: float
    feels_like: float
    humidity: int
    description: str
    icon: str
    wind_speed: float


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


# Authentication Schemas
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None