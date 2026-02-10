from dotenv import load_dotenv
import os

# Load a specific env file
load_dotenv(dotenv_path=".env.local")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Supabase URL or Key not set in environment")

from supabase import create_client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

data = supabase.table("users").select("*").limit(5).execute()

# Print results
if data.data is not None:
    print("Supabase query successful! First few users:")
    print(data.data)
else:
    print("No data returned or query failed.")

from uuid import uuid4

insert_data = supabase.table("users").insert({
    "id": str(uuid4()),
    "username": "testuser",
    "email": "testuser@example.com",
    "password": "hashedpassword",
    "firstName": "Test",
    "lastName": "User"
}).execute()

print("Insert result:", insert_data.data)


data = supabase.table("users").select("*").execute()
print(data.data)
