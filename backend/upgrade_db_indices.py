import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "flashcards.db")

def upgrade_db():
    print(f"Connecting to database to add performance indexes: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    indexes = [
        ("ix_user_stats_user_id", "user_stats", "user_id"),
        ("ix_activity_logs_user_id", "activity_logs", "user_id"),
        ("ix_flashcard_sets_user_id", "flashcard_sets", "user_id"),
        ("ix_flashcards_set_id", "flashcards", "set_id")
    ]

    for index_name, table_name, column_name in indexes:
        try:
            cursor.execute(f"CREATE INDEX IF NOT EXISTS {index_name} ON {table_name}({column_name})")
            print(f"Index {index_name} on {table_name}({column_name}) added successfully.")
        except Exception as e:
            print(f"Error adding index {index_name}: {e}")

    conn.commit()
    conn.close()
    print("Database index upgrades completed.")

if __name__ == "__main__":
    upgrade_db()
