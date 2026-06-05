import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'flashcards.db')

def upgrade_database():
    print(f"Connecting to database at {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Try adding podcast_script
    try:
        cursor.execute("ALTER TABLE flashcard_sets ADD COLUMN podcast_script TEXT NULL;")
        print("Successfully added podcast_script to flashcard_sets table.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Column podcast_script already exists in flashcard_sets.")
        else:
            print(f"Error adding podcast_script: {e}")

    conn.commit()
    conn.close()
    print("Database upgrade completed successfully.")

if __name__ == "__main__":
    upgrade_database()
