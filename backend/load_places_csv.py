"""
One-time script to load final_full_dataset_ready.csv into the places table.
Run: python load_places_csv.py
"""
import pandas as pd
from geoalchemy2.elements import WKTElement
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config.settings import get_settings
from database_models.postgres_model import Base, Place, CategoryEnum, CrowdLevelEnum

settings = get_settings()
engine = create_engine(settings.SYNC_DATABASE_URL, echo=False)
Session = sessionmaker(bind=engine)

def run():
    # Ensure tables exist
    with engine.connect() as conn:
        from sqlalchemy import text
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
        conn.commit()
    Base.metadata.create_all(bind=engine)

    df = pd.read_csv("data/final_full_dataset_ready.csv")
    print(f"Loading {len(df)} places...")

    db = Session()
    loaded = 0
    skipped = 0

    for idx, row in df.iterrows():
        try:
            lat = float(row["latitude"])
            lon = float(row["longitude"])

            place = Place(
                external_id=f"place_{idx+1}",
                name=str(row["name"]),
                category=CategoryEnum(row["category"]),
                subcategory=str(row["subcategory"]) if pd.notna(row.get("subcategory")) else str(row["category"]),
                city=str(row["city"]),
                state=str(row.get("state", "")),
                country=str(row.get("country", "India")),
                latitude=lat,
                longitude=lon,
                location=WKTElement(f"POINT({lon} {lat})", srid=4326),
                description=str(row.get("description", "")),
                tags=[],
                avg_cost=float(row["avg_cost"]) if pd.notna(row.get("avg_cost")) else 0.0,
                avg_rating=float(row["avg_rating"]) if pd.notna(row.get("avg_rating")) else 0.0,
                crowd_level=CrowdLevelEnum(row["crowd_level"]),
                popularity_score=float(row["popularity_score"]) if pd.notna(row.get("popularity_score")) else 0.5,
                is_outdoor=bool(row.get("is_outdoor", False)),
            )
            db.add(place)
            loaded += 1

            if loaded % 100 == 0:
                db.flush()
                print(f"  {loaded}/{len(df)} loaded...")

        except Exception as e:
            print(f"  Skipping row {idx} ({row.get('name','?')}): {e}")
            skipped += 1

    db.commit()
    db.close()
    print(f"\n✅ Done! {loaded} places loaded, {skipped} skipped.")
    print("Now restart your FastAPI server.")

if __name__ == "__main__":
    run()