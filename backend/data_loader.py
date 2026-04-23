"""
Data Loader — loads final_full_dataset_ready.csv into the places table.

Usage:
    python data_loader.py                # load places from CSV
    python data_loader.py --clear        # drop all tables, recreate, then load
    python data_loader.py --status       # show row counts only
"""

import sys
import json
import argparse
import logging
import re
from pathlib import Path
from datetime import datetime

import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from contextlib import contextmanager

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

CSV_PATH = Path(__file__).parent / "data" / "final_full_dataset_ready.csv"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_pg_array(value) -> list:
    """
    Parse PostgreSQL-style array strings like '{"winter","monsoon"}'
    or Python-style '['a','b']' into a plain Python list.
    """
    if not value or (isinstance(value, float)):
        return []
    s = str(value).strip()
    # PostgreSQL set notation  {"a","b"}
    if s.startswith("{") and s.endswith("}"):
        inner = s[1:-1]
        return [item.strip().strip('"') for item in inner.split(",") if item.strip()]
    # Python list notation  ['a','b']
    if s.startswith("[") and s.endswith("]"):
        inner = s[1:-1]
        return [item.strip().strip("'\"") for item in inner.split(",") if item.strip()]
    return [s]


def _parse_opening_hours(value) -> dict:
    if not value or (isinstance(value, float)):
        return {}
    try:
        return json.loads(str(value))
    except Exception:
        return {}


# ---------------------------------------------------------------------------
# DB setup
# ---------------------------------------------------------------------------

def _get_engine_and_session():
    from config.settings import get_settings
    settings = get_settings()
    engine = create_engine(settings.SYNC_DATABASE_URL, echo=False)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    return engine, Session


@contextmanager
def get_db(Session):
    db = Session()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def init_schema(engine):
    from database_models.postgres_model import Base
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
        conn.commit()
    Base.metadata.create_all(bind=engine)
    logger.info("✓ Schema created / verified")


# ---------------------------------------------------------------------------
# Loader
# ---------------------------------------------------------------------------

def load_places(db) -> int:
    from database_models.postgres_model import Place
    from geoalchemy2.elements import WKTElement

    if not CSV_PATH.exists():
        logger.error(f"CSV not found: {CSV_PATH}")
        logger.error("Put final_full_dataset_ready.csv inside the data/ folder.")
        sys.exit(1)

    df = pd.read_csv(CSV_PATH)
    logger.info(f"CSV loaded — {len(df)} rows")

    loaded, skipped = 0, 0

    for idx, row in df.iterrows():
        try:
            lat = float(row["latitude"])
            lon = float(row["longitude"])

            place = Place(
                name             = str(row["name"]),
                category         = str(row["category"]),
                city             = str(row["city"]),
                state            = str(row.get("state", "")) if pd.notna(row.get("state")) else "",
                country          = str(row.get("country", "India")) if pd.notna(row.get("country")) else "India",
                latitude         = lat,
                longitude        = lon,
                location         = WKTElement(f"POINT({lon} {lat})", srid=4326),
                description      = str(row["description"]) if pd.notna(row.get("description")) else "",
                tags             = _parse_pg_array(row.get("tags")),
                avg_rating       = float(row["avg_rating"]) if pd.notna(row.get("avg_rating")) else 0.0,
                crowd_level      = str(row["crowd_level"]) if pd.notna(row.get("crowd_level")) else "MEDIUM",
                popularity_score = float(row["popularity_score"]) if pd.notna(row.get("popularity_score")) else 0.5,
                is_outdoor       = bool(row.get("is_outdoor", False)),
                best_season      = _parse_pg_array(row.get("best_season")),
                opening_hours    = _parse_opening_hours(row.get("opening_hours")),
                created_at       = datetime.utcnow(),
                updated_at       = datetime.utcnow(),
            )
            db.add(place)
            loaded += 1

            if loaded % 100 == 0:
                db.flush()
                logger.info(f"  {loaded}/{len(df)} rows inserted ...")

        except Exception as e:
            logger.warning(f"  Row {idx} ({row.get('name', '?')}) skipped: {e}")
            skipped += 1

    db.flush()
    logger.info(f"✓ {loaded} places loaded, {skipped} skipped")
    return loaded


# ---------------------------------------------------------------------------
# Status / Clear
# ---------------------------------------------------------------------------

def show_status(engine, Session):
    from database_models.postgres_model import Base, Place
    Base.metadata.create_all(bind=engine)
    with get_db(Session) as db:
        count = db.query(Place).count()
        logger.info(f"places table: {count} rows")


def clear_all(engine):
    from database_models.postgres_model import Base
    logger.warning("Dropping all tables ...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    logger.info("✓ Tables dropped and recreated (empty)")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    engine, Session = _get_engine_and_session()
    init_schema(engine)

    with get_db(Session) as db:
        count = load_places(db)

    logger.info("\n" + "=" * 60)
    logger.info(f"✅  DONE — {count} places in database")
    logger.info("=" * 60)
    logger.info("Next: uvicorn main:app --reload")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--clear",  action="store_true", help="Drop tables then reload")
    parser.add_argument("--status", action="store_true", help="Show row counts and exit")
    args = parser.parse_args()

    engine, Session = _get_engine_and_session()

    if args.status:
        show_status(engine, Session)
        sys.exit(0)

    if args.clear:
        clear_all(engine)

    main()
