"""
Simplified PostgreSQL models.

Only the tables and columns that are actually used by the app are kept:
  - users         (auth + ML profile)
  - places        (your dataset — 505 rows)
  - interactions  (user actions, drives ML)
  - saved_places  (bookmarks)

Removed:
  - UserPreference, PlaceImage, UserSession
  - RecommendationLog, SearchLog, SearchLog
  - PrecomputedCandidate, ModelMetadata, CacheInvalidation
  - CategoryEnum  → replaced with plain String (your data has 43 categories)
  - CrowdLevelEnum → replaced with plain String (HIGH / MEDIUM / LOW)
"""

import enum
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey,
    Index, Integer, String, Text, JSON,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from geoalchemy2 import Geography

Base = declarative_base()


# ---------------------------------------------------------------------------
# Enums — only for fields that truly need a fixed set of values
# ---------------------------------------------------------------------------

class GenderEnum(str, enum.Enum):
    MALE   = "male"
    FEMALE = "female"
    OTHER  = "other"
    PREFER_NOT_TO_SAY = "prefer_not_to_say"


class CompanionTypeEnum(str, enum.Enum):
    SOLO     = "solo"
    COUPLE   = "couple"
    FAMILY   = "family"
    FRIENDS  = "friends"
    GROUP    = "group"


class InteractionTypeEnum(str, enum.Enum):
    CLICK           = "click"
    PREVIEW_VIEWED  = "preview_viewed"
    ROUTE_REQUESTED = "route_requested"
    SAVE            = "save"
    SKIP            = "skip"
    SEARCH          = "search"


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    user_id    = Column(Integer, primary_key=True, autoincrement=True)
    email      = Column(String(255), unique=True, nullable=False, index=True)
    username   = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name  = Column(String(255))

    # ML profile
    age                   = Column(Integer)
    gender                = Column(String(20))          # "male" / "female" / "other"
    budget                = Column(Float)
    preferred_crowd_level = Column(String(20))          # "HIGH" / "MEDIUM" / "LOW"
    preferences           = Column(ARRAY(String))       # list of category strings
    companion_type        = Column(String(20))          # "solo" / "couple" / etc.

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active  = Column(Boolean, default=True)
    last_login = Column(DateTime)

    # Relationships
    interactions = relationship("Interaction",  back_populates="user", cascade="all, delete-orphan")
    saved_places = relationship("SavedPlace",   back_populates="user", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# Places  (maps 1-to-1 with your CSV columns)
# ---------------------------------------------------------------------------

class Place(Base):
    __tablename__ = "places"

    place_id   = Column(Integer, primary_key=True, autoincrement=True)
    name       = Column(String(255), nullable=False, index=True)

    # Category stored as plain string — no enum, supports all 43 values in CSV
    category   = Column(String(100), nullable=False, index=True)

    city       = Column(String(100), nullable=False, index=True)
    state      = Column(String(100))
    country    = Column(String(100), default="India")

    latitude   = Column(Float, nullable=False)
    longitude  = Column(Float, nullable=False)
    location   = Column(
        Geography(geometry_type="POINT", srid=4326), nullable=False
    )

    description      = Column(Text)
    tags             = Column(ARRAY(String))       # parsed from CSV  e.g. ["shakti","temple"]
    avg_rating       = Column(Float, default=0.0, index=True)
    crowd_level      = Column(String(20))          # "HIGH" / "MEDIUM" / "LOW"
    popularity_score = Column(Float, default=0.0, index=True)
    is_outdoor       = Column(Boolean, default=False)
    best_season      = Column(ARRAY(String))       # ["winter","monsoon"]
    opening_hours    = Column(JSON)                # {"open":"09:00","close":"18:00"}

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    interactions = relationship("Interaction", back_populates="place", cascade="all, delete-orphan")
    saved_places = relationship("SavedPlace",  back_populates="place", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_place_location",         "location",          postgresql_using="gist"),
        Index("idx_place_category_rating",  "category",          "avg_rating"),
        Index("idx_place_city_category",    "city",              "category"),
    )


# ---------------------------------------------------------------------------
# Interactions
# ---------------------------------------------------------------------------

class Interaction(Base):
    __tablename__ = "interactions"

    interaction_id   = Column(Integer, primary_key=True, autoincrement=True)
    user_id          = Column(Integer, ForeignKey("users.user_id",  ondelete="CASCADE"), nullable=False, index=True)
    place_id         = Column(Integer, ForeignKey("places.place_id", ondelete="CASCADE"), nullable=False, index=True)
    interaction_type = Column(String(30), nullable=False, index=True)   # uses InteractionTypeEnum values
    implicit_score   = Column(Float, default=0.0)
    session_id       = Column(String(100))
    timestamp        = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    user  = relationship("User",  back_populates="interactions")
    place = relationship("Place", back_populates="interactions")

    __table_args__ = (
        Index("idx_interaction_user_time",  "user_id",  "timestamp"),
        Index("idx_interaction_place_time", "place_id", "timestamp"),
    )


# ---------------------------------------------------------------------------
# Saved Places
# ---------------------------------------------------------------------------

class SavedPlace(Base):
    __tablename__ = "saved_places"

    id       = Column(Integer, primary_key=True, autoincrement=True)
    user_id  = Column(Integer, ForeignKey("users.user_id",  ondelete="CASCADE"), nullable=False, index=True)
    place_id = Column(Integer, ForeignKey("places.place_id", ondelete="CASCADE"), nullable=False, index=True)
    saved_at = Column(DateTime, default=datetime.utcnow)
    notes    = Column(Text)

    # Relationships
    user  = relationship("User",  back_populates="saved_places")
    place = relationship("Place", back_populates="saved_places")

    __table_args__ = (
        Index("idx_saved_user_place", "user_id", "place_id", unique=True),
    )
