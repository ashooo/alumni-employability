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
    Fetches historical alumni data from the database and returns it as a Pandas DataFrame
    formatted exactly like the original merged CSV.
    """
    conn = get_db_connection()
    
    query = """
    SELECT 
        snapshot.gender as Gender,
        snapshot.age as Age,
        program.code as Degree,
        snapshot.year_graduated as `Year Graduated`,
        snapshot.cgpa as CGPA,
        snapshot.prof_grade as `Average Prof Grade`,
        snapshot.elec_grade as `Average Elec Grade`,
        snapshot.ojt_grade as `OJT Grade`,
        CASE WHEN snapshot.leader_pos = 1 THEN 'Yes' ELSE 'No' END as `Leadership POS`,
        CASE WHEN snapshot.act_member_pos = 1 THEN 'Yes' ELSE 'No' END as `Act Member POS`,
        snapshot.soft_skills_ave as `Soft Skills Ave`,
        snapshot.hard_skills_ave as `Hard Skills Ave`,
        CASE WHEN snapshot.is_employable = 1 THEN 'Employable' ELSE 'Not Employable' END as Employability
    FROM academic_snapshot snapshot
    JOIN program ON snapshot.program_id = program.id
    """
    
    try:
        df = pd.read_sql(query, conn)
        
        # Convert Decimals to Floats for Pandas compatibility
        float_cols = ['CGPA', 'Average Prof Grade', 'Average Elec Grade', 'OJT Grade', 'Soft Skills Ave', 'Hard Skills Ave']
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
