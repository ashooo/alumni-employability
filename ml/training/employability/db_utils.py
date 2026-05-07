import os
import pandas as pd
import mysql.connector
from dotenv import load_dotenv
from urllib.parse import urlparse

# Load environment variables from the server directory
DOTENV_PATH = os.path.join(os.path.dirname(__file__), '../../../server/.env')
load_dotenv(DOTENV_PATH)

def get_db_connection():
    """
    Establishes a connection to the MySQL database using the DATABASE_URL from .env.
    """
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        raise ValueError("DATABASE_URL not found in environment. Check server/.env")

    # Parse mysql://user:pass@host:port/dbname
    parsed = urlparse(db_url)
    
    # Extract credentials and connection info
    username = parsed.username
    password = parsed.password
    hostname = parsed.hostname
    port = parsed.port or 3306
    database = parsed.path.lstrip('/')

    return mysql.connector.connect(
        user=username,
        password=password,
        host=hostname,
        port=port,
        database=database
    )

def get_training_data():
    """
    Fetches historical alumni data from the database and returns a training DataFrame
    that includes:
      - Core academic features
      - Program/Course code
      - Board Exam (if present in schema; otherwise default 0)
      - Pivoted skill columns from academic_snapshot_skill
      - Employability target label
    """
    conn = get_db_connection()

    base_query = """
    SELECT 
        snapshot.id as snapshot_id,
        snapshot.gender as Gender,
        snapshot.age as Age,
        program.code as Program,
        program.code as Degree,
        snapshot.year_graduated as `Year Graduated`,
        snapshot.cgpa as CGPA,
        snapshot.prof_grade as `Average Prof Grade`,
        snapshot.elec_grade as `Average Elec Grade`,
        snapshot.ojt_grade as `OJT Grade`,
        snapshot.leader_pos as `Leadership POS`,
        snapshot.act_member_pos as `Act Member POS`,
        snapshot.soft_skills_ave as `Soft Skills Ave`,
        snapshot.hard_skills_ave as `Hard Skills Ave`,
        CASE WHEN snapshot.is_employable = 1 THEN 'Employable' ELSE 'Not Employable' END as Employability
    FROM academic_snapshot snapshot
    JOIN program ON snapshot.program_id = program.id
    """

    try:
        df = pd.read_sql(base_query, conn)

        # Optional board_exam column support.
        col_check = """
        SELECT COUNT(*) AS cnt
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'academic_snapshot'
          AND column_name = 'board_exam'
        """
        has_board_exam = int(pd.read_sql(col_check, conn).iloc[0]["cnt"]) > 0
        if has_board_exam:
            board_exam_query = """
            SELECT id as snapshot_id, board_exam as `Board Exam`
            FROM academic_snapshot
            """
            board_df = pd.read_sql(board_exam_query, conn)
            df = df.merge(board_df, on="snapshot_id", how="left")
        else:
            df["Board Exam"] = 0
            print("[INFO] academic_snapshot.board_exam not found; defaulting `Board Exam` to 0.")

        # Pivot skill rows into wide columns.
        skills_query = """
        SELECT
          academic_snapshot_id as snapshot_id,
          skill_name,
          skill_value
        FROM academic_snapshot_skill
        """
        skill_rows = pd.read_sql(skills_query, conn)
        if not skill_rows.empty:
            skill_rows["skill_value"] = pd.to_numeric(skill_rows["skill_value"], errors="coerce")
            skill_pivot = (
                skill_rows.pivot_table(
                    index="snapshot_id",
                    columns="skill_name",
                    values="skill_value",
                    aggfunc="mean"
                )
                .reset_index()
            )
            df = df.merge(skill_pivot, on="snapshot_id", how="left")

        # Convert Decimals to Floats for Pandas compatibility
        float_cols = [
            'CGPA', 'Average Prof Grade', 'Average Elec Grade',
            'OJT Grade', 'Soft Skills Ave', 'Hard Skills Ave', 'Board Exam'
        ]
        for col in float_cols:
            if col in df.columns:
                df[col] = df[col].astype(float)

        return df
    finally:
        conn.close()

if __name__ == "__main__":
    print("Testing database connection and data retrieval...")
    try:
        data = get_training_data()
        print(f"Successfully retrieved {len(data)} records.")
        print("\nSample Data (First 5 rows):")
        print(data.head())
        print("\nColumn Information:")
        print(data.dtypes)
    except Exception as e:
        print(f"Error: {e}")
