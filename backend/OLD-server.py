from fastapi import FastAPI, HTTPException, status, Response, Request, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime, timedelta, timezone
import json,os,jwt,sqlite3,bcrypt,uuid,uvicorn,dotenv,socket
import json,os,jwt,bcrypt,uuid,uvicorn,dotenv,socket
from contextlib import asynccontextmanager
from fastapi.exceptions import RequestValidationError
from pathlib import Path
from fastapi.responses import JSONResponse
from google import genai
from enum import Enum
import httpx
import asyncio
from time import time
from supabase import create_client, Client



# Server initialization
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    # Database initialization is handled externally for Supabase
    yield

ASUS_LOCAL_URL = "http://127.0.0.1:8001/predict"  # optional, can be offline
MINI_ONLINE_URL = "https://tasklinex-mini-ai.hf.space/predict"  # placeholder
AI_TIMEOUT = 5.0

app = FastAPI(lifespan=lifespan)

# Load environment variables
backend_dir = Path(__file__).resolve().parent
root_dir = backend_dir.parent
dotenv_path = root_dir / ".env.local"

if dotenv_path.exists():
    dotenv.load_dotenv(dotenv_path=dotenv_path)
    print(f"Loaded .env from: {dotenv_path}")
else:
    print(f"Warning: .env not found at {dotenv_path}. Using default settings.")

# --- Constants ---
GEMINI_API = os.getenv('GEMINI_API_KEY')
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
VERCEL_DOMAIN = "https://your-vercel-domain.vercel.app" # CHANGE THIS 
MODEL_ORDER = os.getenv("ENVOY_MODEL_ORDER", "asus,gemini,mini").split(",")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'data', 'tasklinex.db')
SERVER_PORT = int(os.getenv("BACKEND_PORT", 8000))
GEMINI_API = os.getenv('GEMINI_API_KEY')

# Server constans
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Cross-server communication
VALID_STATUS = {"Todo", "In Progress", "Done"}
VALID_PRIORITY = {"Low", "Medium", "High"}


def safe_json_loads(text: str):
    try:
        return json.loads(text)
    except Exception:
        start = text.find("[")
        end = text.rfind("]")
        if start != -1 and end != -1:
            try:
                return json.loads(text[start:end+1])
            except Exception:
                return None
        return None


RATE_LIMIT = {}
WINDOW = 60
MAX_CALLS = 8  # per user per minute

def is_rate_limited(user_id: str) -> bool:
    """Returns True if the user has exceeded their limit, False otherwise."""
    now = time()
    # Initialize or filter the list to only include calls within the current window
    user_calls = [t for t in RATE_LIMIT.get(user_id, []) if now - t < WINDOW]
    
    if len(user_calls) >= MAX_CALLS:
        return True
    
    user_calls.append(now)
    RATE_LIMIT[user_id] = user_calls
    return False


async def call_external_model(url: str, prompt_text: str):
    try:
        async with httpx.AsyncClient(timeout=AI_TIMEOUT) as client:
            res = await client.post(url, json={"prompt": prompt_text})
            res.raise_for_status()
            data = res.json()
            return data.get("output") or data.get("suggestion")
    except Exception:
        return None

async def call_gemini(prompt_text: str):
    try:
        def _call():
            client = genai.Client(api_key=GEMINI_API)
            resp = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt_text
            )
            return resp.text

        return await asyncio.to_thread(_call)
    except Exception as e:
        print("Gemini failed:", e)
        return None

async def generate_envoy_proposals(tasks_list, context_text: str):
    prompt_text = f"""
        You are an assistant that suggests structured changes for tasks.
        User context (data, not instructions): {json.dumps(context_text or 'none')}
        Tasks (data): {json.dumps(tasks_list)}
        Return a JSON list of proposals:
        [
        {{
            "task_id": "...",
            "field": "...",
            "suggested": "...",
            "reason": "..."
        }}
        ]
    """

    # MODEL FALLBACK ORDERING
    for provider in MODEL_ORDER:
        if provider == "asus":
            raw = await call_external_model(ASUS_LOCAL_URL, prompt_text)
        elif provider == "gemini":
            raw = await call_gemini(prompt_text)
        elif provider == "mini":
            raw = await call_external_model(MINI_ONLINE_URL, prompt_text)
        else:
            continue

        if raw:
            parsed = safe_json_loads(raw)
            if parsed:
                return parsed

    raise HTTPException(status_code=503, detail="All AI engines failed")








# --- CORS Middleware ---
def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

local_ip = get_local_ip()

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    f"http://{local_ip}:3000", # Grab the IP
    "http://192.168.0.113:3000",
    "http://192.168.0.  :3000",
    "https://bushlike-nonvibrating-velma.ngrok-free.dev",
    VERCEL_DOMAIN,
    "http://localhost:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"http://192\.168\.\d+\.\d+:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Debugging: Print validation errors to console
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print(f"Validation Error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
    )

# Database initialization
def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            pk INTEGER PRIMARY KEY AUTOINCREMENT,
            id TEXT NOT NULL UNIQUE,
            firstName TEXT,
            lastName TEXT,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            companyName TEXT,
            role TEXT DEFAULT 'user',
            avg_task_completion_time REAL DEFAULT 0,
            completed_tasks_count INTEGER DEFAULT 0
        )
    ''')
    
    # Migrations for existing users table
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN username TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN avg_task_completion_time REAL DEFAULT 0")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN completed_tasks_count INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass

    try:
        cursor.execute("ALTER TABLE users ADD COLUMN skills TEXT DEFAULT '[]'")
    except sqlite3.OperationalError:
        pass

    try:
        cursor.execute("ALTER TABLE users ADD COLUMN isNew BOOLEAN DEFAULT 1")
    except sqlite3.OperationalError:
        pass

    try:
        cursor.execute("ALTER TABLE users ADD COLUMN timezone TEXT DEFAULT 'UTC'")
    except sqlite3.OperationalError:
        pass

    # Settings column in users (stores JSON for envoy, visuals, experimental)
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN settings TEXT DEFAULT '{}'")
    except sqlite3.OperationalError:
        pass

    # Persona extended fields
    try:
        cursor.execute("ALTER TABLE personas ADD COLUMN role TEXT DEFAULT 'Member'")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE personas ADD COLUMN color TEXT DEFAULT '#6366f1'")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE personas ADD COLUMN allow_overload BOOLEAN DEFAULT 0")
    except sqlite3.OperationalError:
        pass

    # Tasks table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
            pk INTEGER PRIMARY KEY AUTOINCREMENT,
            id TEXT NOT NULL UNIQUE,
            projectId TEXT NOT NULL,
            title TEXT NOT NULL,
            startDate INTEGER NOT NULL,
            duration INTEGER NOT NULL,
            plannedDuration INTEGER NOT NULL,
            progress INTEGER NOT NULL,
            status TEXT NOT NULL,
            priority TEXT NOT NULL,
            ownerId TEXT NOT NULL,
            personaId TEXT,
            dependencyIds TEXT,
            tags TEXT
        )
    ''')
    
    # Dependencies table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS dependencies (
            id TEXT PRIMARY KEY,
            from_task_id TEXT NOT NULL,
            to_task_id TEXT NOT NULL,
            type TEXT NOT NULL,
            note TEXT,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (from_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
            FOREIGN KEY (to_task_id) REFERENCES tasks(id) ON DELETE CASCADE
        )
    ''')
    try:
        cursor.execute("ALTER TABLE tasks ADD COLUMN completedAt INTEGER")
    except sqlite3.OperationalError:
        pass

    # Migration: Always run this check to ensure users with tasks are NOT marked as new
    # This fixes the issue where existing users might be stuck with isNew=1
    cursor.execute('''
        UPDATE users 
        SET isNew = 0 
        WHERE id IN (SELECT DISTINCT ownerId FROM tasks)
    ''')

    # Personas table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS personas (
            pk INTEGER PRIMARY KEY AUTOINCREMENT,
            id TEXT NOT NULL UNIQUE,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            weekly_capacity_hours REAL NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')

    # Task-Persona assignments table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS task_persona_assignments (
            pk INTEGER PRIMARY KEY AUTOINCREMENT,
            id TEXT NOT NULL UNIQUE,
            task_id TEXT NOT NULL,
            persona_id TEXT NOT NULL,
            FOREIGN KEY (task_id) REFERENCES tasks(id),
            FOREIGN KEY (persona_id) REFERENCES personas(id)
        )
    ''')

    # Interventions table (Envoy System Warnings)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS interventions (
            pk INTEGER PRIMARY KEY AUTOINCREMENT,
            id TEXT NOT NULL UNIQUE,
            team_id TEXT,
            user_id TEXT,
            type TEXT,
            message TEXT,
            status TEXT DEFAULT 'pending',
            created_at INTEGER
        )
    ''')

        # Interventions table (Envoy System Warnings)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS interventions (
            pk INTEGER PRIMARY KEY AUTOINCREMENT,
            id TEXT NOT NULL UNIQUE,
            team_id TEXT,
            user_id TEXT,
            type TEXT,
            message TEXT,
            status TEXT DEFAULT 'pending',
            created_at INTEGER
        )
    ''')

    # Activity Log table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS activity_log (
            pk INTEGER PRIMARY KEY AUTOINCREMENT,
            id TEXT NOT NULL UNIQUE,
            userId TEXT NOT NULL,
            type TEXT NOT NULL,
            targetTask TEXT,
            targetLink TEXT DEFAULT '#',
            details TEXT,
            timestamp INTEGER
        )
    ''')

    # Projects table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS projects (
            pk INTEGER PRIMARY KEY AUTOINCREMENT,
            id TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            visible BOOLEAN DEFAULT 1
        )
    ''')
    
    # Seed default projects if empty
    cursor.execute("SELECT count(*) FROM projects")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO projects (id, name) VALUES ('proj1', 'Forge.AI Core')")
        cursor.execute("INSERT INTO projects (id, name) VALUES ('proj2', 'Web Dashboard V2')")

    conn.commit()
    conn.close()


# Classes with pydantic
class Task(BaseModel):
    id: str
    projectId: str
    title: str
    startDate: int
    duration: int
    plannedDuration: int
    progress: int
    status: str
    priority: str
    ownerId: str
    ownerName: Optional[str] = None
    personaId: Optional[str] = None
    dependencyIds: List[str] = []
    tags: List[str] = []
    userId: Optional[str] = None


class PersonaCreate(BaseModel):
    name: str
    weekly_capacity_hours: float = 40.0
    user_id: str = "default_user"

class PersonaDelete(BaseModel):
    id: str

class ProjectCreate(BaseModel):
    name: str
    userId: Optional[str] = None

class ProjectDelete(BaseModel):
    id: str
    userId: Optional[str] = None
class DependencyType(str, Enum):
    blocked_by = "blocked_by"
    waiting_on = "waiting_on"
    helpful_if_done_first = "helpful_if_done_first"

class DependencyCreate(BaseModel):
    from_task_id: str
    to_task_id: str
    type: DependencyType
    note: Optional[str] = None
    userId: str

class DependencyUpdate(BaseModel):
    type: Optional[DependencyType] = None
    note: Optional[str] = None
    userId: str

class DependencyLookup(BaseModel):
    from_task_id: str
    to_task_id: str

class Persona(BaseModel):
    id: str
    name: str
    weekly_capacity_hours: float = Field(gt=0)
    current_load_hours: float = Field(ge=0)

    @property
    def utilization(self) -> float:
        return self.current_load_hours / self.weekly_capacity_hours

class EnvoySuggestion(BaseModel):
    task_id: str
    suggestion_type: str
    confidence: float = Field(ge=0, le=1)
    message: str

class UserCreate(BaseModel):
    firstName: str
    lastName: str
    username: str
    email: str
    password: str
    companyName: Optional[str] = None
    rememberMe: bool = False
    role: str = "user"

class UserLogin(BaseModel):
    email: str
    password: str
    rememberMe: bool = False

class Proposal(BaseModel):
    field:str
    suggested:str
    reason:Optional[str]=None
class EnvoyRequest(BaseModel):
    task_id:str
    all:Optional[bool]=False
    context_text: Optional[str]=None
    proposals:Optional[List[Proposal]] = None

class DeleteRequest(BaseModel):
    id:str
    userId: Optional[str] = None

class AutoBalanceRequest(BaseModel):
    userId: str

class CompleteTaskRequest(BaseModel):
    taskId: str
    userId: str

class AddMemberRequest(BaseModel):
    userId: str
    username: str

class UpdateSkillsRequest(BaseModel):
    requesterId: str
    targetUserId: str
    skills: List[str]

class SetFocusRequest(BaseModel):
    taskId: str
    userId: str

class UpdateAccountRequest(BaseModel):
    userId: str
    displayName: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    timezone: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    userId: str
    currentPassword: str
    newPassword: str

class DeleteAccountRequest(BaseModel):
    userId: str
    password: str


# Endpoints
@app.get('/')
async def root():
    return {"status":'ok',"message": "TaskLinex API is active"}

# def update_task_status_after_dependency_change(cursor, task_id: str):
def update_task_status_after_dependency_change(task_id: str):
    # Check for blocking dependencies on incomplete tasks
    cursor.execute("""
        SELECT 1 FROM dependencies d
        JOIN tasks t ON d.from_task_id = t.id
        WHERE d.to_task_id = ? AND d.type = 'blocked_by' AND t.status != 'Done'
        LIMIT 1
    """, (task_id,))
    is_blocked = cursor.fetchone()
    res = supabase.table('dependencies').select('from_task_id').eq('to_task_id', task_id).eq('type', 'blocked_by').execute()
    blocked_by_ids = [d['from_task_id'] for d in res.data]
    
    is_blocked = False
    if blocked_by_ids:
        # Check if any of these tasks are NOT Done
        tasks_res = supabase.table('tasks').select('status').in_('id', blocked_by_ids).neq('status', 'Done').execute()
        if tasks_res.data:
            is_blocked = True

    if is_blocked:
        cursor.execute("UPDATE tasks SET status = 'Blocked' WHERE id = ?", (task_id,))
        supabase.table('tasks').update({'status': 'Blocked'}).eq('id', task_id).execute()
        return

    # Check for waiting_on dependencies
    cursor.execute("SELECT 1 FROM dependencies WHERE to_task_id = ? AND type = 'waiting_on' LIMIT 1", (task_id,))
    is_waiting = cursor.fetchone()
    res_waiting = supabase.table('dependencies').select('id').eq('to_task_id', task_id).eq('type', 'waiting_on').execute()
    is_waiting = bool(res_waiting.data)

    if is_waiting:
        cursor.execute("UPDATE tasks SET status = 'At Risk' WHERE id = ?", (task_id,)) # Mapping 'waiting' to 'At Risk'
        supabase.table('tasks').update({'status': 'At Risk'}).eq('id', task_id).execute()
        return

    # If neither, and status was dependency-related, revert to 'On Track'
    cursor.execute("UPDATE tasks SET status = 'On Track' WHERE id = ? AND status IN ('Blocked', 'At Risk')", (task_id,))
    supabase.table('tasks').update({'status': 'On Track'}).eq('id', task_id).in_('status', ['Blocked', 'At Risk']).execute()

# def log_event(cursor, userId, type, targetTask, details):
def log_event(userId, type, targetTask, details):
    event_id = str(uuid.uuid4())
    timestamp = int(datetime.now(timezone.utc).timestamp())
    cursor.execute('''
        INSERT INTO activity_log (id, userId, type, targetTask, details, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (event_id, userId, type, targetTask, details, timestamp))
    supabase.table('activity_log').insert({
        'id': event_id,
        'userId': userId,
        'type': type,
        'targetTask': targetTask,
        'details': details,
        'timestamp': timestamp
    }).execute()

def time_ago(timestamp):
    now = datetime.now(timezone.utc).timestamp()
    diff = now - timestamp
    if diff < 60: return "Just now"
    elif diff < 3600: return f"{int(diff/60)}m ago"
    elif diff < 86400: return f"{int(diff/3600)}h ago"
    else: return f"{int(diff/86400)}d ago"

@app.post('/signup')
async def signup(user: UserCreate, response: Response):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE email = ?', (user.email,))
    existing_user = cursor.fetchone()

    if existing_user:
        conn.close()
    res = supabase.table('users').select('id').eq('email', user.email).execute()
    if res.data:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered.")

    cursor.execute('SELECT * FROM users WHERE username = ?', (user.username,))
    existing_username = cursor.fetchone()
    if existing_username:
        conn.close()
    res = supabase.table('users').select('id').eq('username', user.username).execute()
    if res.data:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken.")

    hashed_pass = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt())
    user_id = str(uuid.uuid4())

    cursor.execute(
        'INSERT INTO users (id, firstName, lastName, username, email, password, companyName, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        (user_id, user.firstName, user.lastName, user.username, user.email, hashed_pass.decode('utf-8'), user.companyName, user.role)
    )
    conn.commit()
    conn.close()
    supabase.table('users').insert({
        'id': user_id,
        'firstName': user.firstName,
        'lastName': user.lastName,
        'username': user.username,
        'email': user.email,
        'password': hashed_pass.decode('utf-8'),
        'companyName': user.companyName,
        'role': user.role
    }).execute()

    # Auto-login: Generate access token immediately after signup
    token_span = timedelta(days=15) if user.rememberMe else timedelta(minutes=30)
    expire = datetime.now(timezone.utc) + token_span
    payload = {'sub': user.email, 'id': user_id, 'exp': expire}
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    response.set_cookie(
        key="access_token",
        value=f"Bearer {token}",
        httponly=True,
        max_age=int(token_span.total_seconds()),
        expires=expire,
        samesite="lax",
        secure=False
    )

    return {
        "access_token": token, 
        "token_type": "bearer", 
        "id": user_id, 
        "role": user.role,
        "username": user.username,
        "firstName": user.firstName,
        "lastName": user.lastName
    }

@app.post('/login')
async def login(form_data: UserLogin, response: Response):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    res = supabase.table('users').select('password, id, role, companyName, firstName, lastName, username').eq('email', form_data.email).execute()
    user = res.data[0] if res.data else None

    cursor.execute("SELECT password, id, role, companyName, firstName, lastName, username FROM users WHERE email = ?", (form_data.email,))
    result = cursor.fetchone()
    conn.close()

    if not result:
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    stored_hash_str = result[0]
    user_id = result[1]
    role = result[2]
    company = result[3]
    first_name = result[4]
    last_name = result[5]
    username = result[6]
    stored_hash_str = user['password']
    user_id = user['id']
    role = user['role']
    company = user['companyName']
    first_name = user['firstName']
    last_name = user['lastName']
    username = user['username']

    input_password_bytes = form_data.password.encode('utf-8')
    stored_hash_bytes = stored_hash_str.encode('utf-8')

    if not bcrypt.checkpw(input_password_bytes, stored_hash_bytes):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_span = timedelta(days=15) if form_data.rememberMe else timedelta(minutes=30)
    expire = datetime.now(timezone.utc) + token_span
    payload = {'sub': form_data.email, 'id': user_id, 'role': role, 'company': company, 'exp': expire}
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    response.set_cookie(
        key="access_token",
        value=f"Bearer {token}",
        httponly=True,
        max_age=int(token_span.total_seconds()),
        expires=expire,
        samesite="lax",
        secure=False
    )

    return {
        "access_token": token, 
        "token_type": "bearer", 
        "id": user_id, 
        "role": role,
        "username": username,
        "firstName": first_name,
        "lastName": last_name
    }

@app.get('/users/{user_id}')
async def get_user_info(user_id: str):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, firstName, lastName, username, email, role, companyName, timezone FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return dict(user)
    finally:
        conn.close()
    res = supabase.table('users').select('id, firstName, lastName, username, email, role, companyName, timezone').eq('id', user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    return res.data[0]

@app.post('/updateAccount')
async def update_account(req: UpdateAccountRequest):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        # Check if user exists
        cursor.execute("SELECT id FROM users WHERE id = ?", (req.userId,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="User not found")
    # Check if user exists
    res = supabase.table('users').select('id').eq('id', req.userId).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")

        # Check uniqueness for username and email if provided
        if req.username:
            cursor.execute("SELECT id FROM users WHERE username = ? AND id != ?", (req.username, req.userId))
            if cursor.fetchone():
                raise HTTPException(status_code=409, detail="Username already taken")
        
        if req.email:
            cursor.execute("SELECT id FROM users WHERE email = ? AND id != ?", (req.email, req.userId))
            if cursor.fetchone():
                raise HTTPException(status_code=409, detail="Email already taken")
    # Check uniqueness for username and email if provided
    if req.username:
        res = supabase.table('users').select('id').eq('username', req.username).neq('id', req.userId).execute()
        if res.data:
            raise HTTPException(status_code=409, detail="Username already taken")
    
    if req.email:
        res = supabase.table('users').select('id').eq('email', req.email).neq('id', req.userId).execute()
        if res.data:
            raise HTTPException(status_code=409, detail="Email already taken")

        # Update fields
        if req.displayName:
            parts = req.displayName.strip().split(' ', 1)
            first_name = parts[0]
            last_name = parts[1] if len(parts) > 1 else ""
            cursor.execute("UPDATE users SET firstName = ?, lastName = ? WHERE id = ?", (first_name, last_name, req.userId))
        
        if req.username:
            cursor.execute("UPDATE users SET username = ? WHERE id = ?", (req.username, req.userId))
        
        if req.email:
            cursor.execute("UPDATE users SET email = ? WHERE id = ?", (req.email, req.userId))
            
        if req.timezone:
            cursor.execute("UPDATE users SET timezone = ? WHERE id = ?", (req.timezone, req.userId))
    # Update fields
    updates = {}
    if req.displayName:
        parts = req.displayName.strip().split(' ', 1)
        updates['firstName'] = parts[0]
        updates['lastName'] = parts[1] if len(parts) > 1 else ""
    
    if req.username: updates['username'] = req.username
    if req.email: updates['email'] = req.email
    if req.timezone: updates['timezone'] = req.timezone

        conn.commit()
        return {"message": "Account updated successfully"}
    except HTTPException as e:
        raise e
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
    if updates:
        supabase.table('users').update(updates).eq('id', req.userId).execute()

    return {"message": "Account updated successfully"}

@app.post('/changePassword')
async def change_password(req: ChangePasswordRequest):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT password FROM users WHERE id = ?", (req.userId,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
    res = supabase.table('users').select('password').eq('id', req.userId).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    stored_hash = res.data[0]['password']
    if not bcrypt.checkpw(req.currentPassword.encode('utf-8'), stored_hash.encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid current password")
        
        stored_hash = row[0]
        if not bcrypt.checkpw(req.currentPassword.encode('utf-8'), stored_hash.encode('utf-8')):
            raise HTTPException(status_code=401, detail="Invalid current password")
            
        new_hashed = bcrypt.hashpw(req.newPassword.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        cursor.execute("UPDATE users SET password = ? WHERE id = ?", (new_hashed, req.userId))
        conn.commit()
        return {"message": "Password changed successfully"}
    except HTTPException as e:
        raise e
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
    new_hashed = bcrypt.hashpw(req.newPassword.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    supabase.table('users').update({'password': new_hashed}).eq('id', req.userId).execute()
    return {"message": "Password changed successfully"}

@app.post('/deleteAccount')
async def delete_account(req: DeleteAccountRequest):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT password FROM users WHERE id = ?", (req.userId,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
            
        stored_hash = row[0]
        if not bcrypt.checkpw(req.password.encode('utf-8'), stored_hash.encode('utf-8')):
            raise HTTPException(status_code=401, detail="Invalid password")
    res = supabase.table('users').select('password').eq('id', req.userId).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
        
    stored_hash = res.data[0]['password']
    if not bcrypt.checkpw(req.password.encode('utf-8'), stored_hash.encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid password")

        # Delete related data
        cursor.execute("DELETE FROM dependencyIds WHERE task_id IN (SELECT id FROM tasks WHERE ownerId = ?)", (req.userId,))
        cursor.execute("DELETE FROM task_persona_assignments WHERE task_id IN (SELECT id FROM tasks WHERE ownerId = ?)", (req.userId,))
        cursor.execute("DELETE FROM tasks WHERE ownerId = ?", (req.userId,))
        cursor.execute("DELETE FROM personas WHERE user_id = ?", (req.userId,))
        cursor.execute("DELETE FROM activity_log WHERE userId = ?", (req.userId,))
        cursor.execute("DELETE FROM interventions WHERE user_id = ?", (req.userId,))
        # Finally delete user
        cursor.execute("DELETE FROM users WHERE id = ?", (req.userId,))
    # Delete related data
    # Get tasks owned by user to delete their dependencies and assignments
    tasks_res = supabase.table('tasks').select('id').eq('ownerId', req.userId).execute()
    task_ids = [t['id'] for t in tasks_res.data]
    
    if task_ids:
        supabase.table('dependencies').delete().in_('from_task_id', task_ids).execute()
        supabase.table('dependencies').delete().in_('to_task_id', task_ids).execute()
        supabase.table('task_persona_assignments').delete().in_('task_id', task_ids).execute()
        
        conn.commit()
        return {"message": "Account deleted successfully"}
    except HTTPException as e:
        raise e
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
    supabase.table('tasks').delete().eq('ownerId', req.userId).execute()
    supabase.table('personas').delete().eq('user_id', req.userId).execute()
    supabase.table('activity_log').delete().eq('userId', req.userId).execute()
    supabase.table('interventions').delete().eq('user_id', req.userId).execute()
    # Finally delete user
    supabase.table('users').delete().eq('id', req.userId).execute()
    
    return {"message": "Account deleted successfully"}

@app.get('/settings/{user_id}')
async def get_user_settings(user_id: str):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        # 1. Get User & JSON Settings
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        saved_settings = json.loads(user['settings']) if user['settings'] else {}
        
        # 2. Get Personas
        cursor.execute("SELECT * FROM personas WHERE user_id = ?", (user_id,))
        personas_rows = cursor.fetchall()
        active_personas = []
        for row in personas_rows:
            active_personas.append({
                "id": row['id'],
                "name": row['name'],
                "role": row['role'],
                "color": row['color'],
                "capacityLimit": row['weekly_capacity_hours'],
                "allowOverload": bool(row['allow_overload'])
            })
    # 1. Get User & JSON Settings
    res = supabase.table('users').select('*').eq('id', user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    user = res.data[0]
    
    saved_settings = json.loads(user['settings']) if user.get('settings') else {}
    
    # 2. Get Personas
    p_res = supabase.table('personas').select('*').eq('user_id', user_id).execute()
    active_personas = []
    for row in p_res.data:
        active_personas.append({
            "id": row['id'],
            "name": row['name'],
            "role": row.get('role', 'Member'),
            "color": row.get('color', '#6366f1'),
            "capacityLimit": row['weekly_capacity_hours'],
            "allowOverload": bool(row.get('allow_overload', False))
        })

        # 3. Construct Response (Merge DB data with defaults)
        response = {
            "account": {
                "displayName": f"{user['firstName'] or ''} {user['lastName'] or ''}".strip(),
                "email": user['email'],
                "avatarUrl": f"https://ui-avatars.com/api/?name={user['firstName']}+{user['lastName']}&background=random",
                "accountType": user['role'] if user['role'] else 'Individual',
                "language": "en-US",
                "twoFactorEnabled": False
            },
            "personas": {
                "enableVirtualTeammates": saved_settings.get('personas', {}).get('enableVirtualTeammates', True),
                "activePersonas": active_personas
            },
            "envoy": saved_settings.get('envoy', {
                "suggestionsEnabled": True,
                "autoDetectDependencies": True,
                "communicationStyle": 'Concise',
                "sensitivityLevel": 7,
                "permissions": { "canDraftNotes": True, "canProposeHandoffs": True, "canModifyDates": False }
            }),
            "visuals": saved_settings.get('visuals', {
                "defaultTimelineScale": 'Week',
                "showGhostBars": True,
                "showDependencyLines": True,
                "uiDensity": 'Comfortable'
            }),
            "experimental": saved_settings.get('experimental', {
                "enableJQL": False,
                "usegpuAcceleration": True
            })
        }
        return response
    finally:
        conn.close()
    # 3. Construct Response (Merge DB data with defaults)
    response = {
        "account": {
            "displayName": f"{user.get('firstName') or ''} {user.get('lastName') or ''}".strip(),
            "email": user['email'],
            "avatarUrl": f"https://ui-avatars.com/api/?name={user.get('firstName')}+{user.get('lastName')}&background=random",
            "accountType": user.get('role') if user.get('role') else 'Individual',
            "language": "en-US",
            "twoFactorEnabled": False
        },
        "personas": {
            "enableVirtualTeammates": saved_settings.get('personas', {}).get('enableVirtualTeammates', True),
            "activePersonas": active_personas
        },
        "envoy": saved_settings.get('envoy', {
            "suggestionsEnabled": True,
            "autoDetectDependencies": True,
            "communicationStyle": 'Concise',
            "sensitivityLevel": 7,
            "permissions": { "canDraftNotes": True, "canProposeHandoffs": True, "canModifyDates": False }
        }),
        "visuals": saved_settings.get('visuals', {
            "defaultTimelineScale": 'Week',
            "showGhostBars": True,
            "showDependencyLines": True,
            "uiDensity": 'Comfortable'
        }),
        "experimental": saved_settings.get('experimental', {
            "enableJQL": False,
            "usegpuAcceleration": True
        })
    }
    return response

@app.post('/settings/{user_id}/{section}')
async def update_user_settings_section(user_id: str, section: str, payload: dict = Body(...)):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT settings FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
    res = supabase.table('users').select('settings').eq('id', user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    current_settings = json.loads(res.data[0]['settings']) if res.data[0]['settings'] else {}
    
    if section == 'personas':
        # Update boolean setting
        if 'personas' not in current_settings: current_settings['personas'] = {}
        current_settings['personas']['enableVirtualTeammates'] = payload.get('enableVirtualTeammates', True)
        
        current_settings = json.loads(row['settings']) if row['settings'] else {}
        # Sync Personas Table
        incoming_personas = payload.get('activePersonas', [])
        incoming_ids = [p['id'] for p in incoming_personas if 'id' in p]
        
        if section == 'personas':
            # Update boolean setting
            if 'personas' not in current_settings: current_settings['personas'] = {}
            current_settings['personas']['enableVirtualTeammates'] = payload.get('enableVirtualTeammates', True)
            
            # Sync Personas Table
            incoming_personas = payload.get('activePersonas', [])
            incoming_ids = [p['id'] for p in incoming_personas if 'id' in p]
            
            # Delete removed
            cursor.execute("DELETE FROM personas WHERE user_id = ? AND id NOT IN ({})".format(','.join(['?']*len(incoming_ids))), (user_id, *incoming_ids))
            
            # Upsert incoming
            for p in incoming_personas:
                cursor.execute("""
                    INSERT OR REPLACE INTO personas (id, user_id, name, role, color, weekly_capacity_hours, allow_overload)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (p.get('id') or str(uuid.uuid4()), user_id, p['name'], p.get('role', 'Member'), p.get('color', '#6366f1'), p.get('capacityLimit', 40), p.get('allowOverload', False)))
            
        elif section in ['envoy', 'visuals', 'experimental']:
            current_settings[section] = payload
        # Delete removed
        if incoming_ids:
            supabase.table('personas').delete().eq('user_id', user_id).not_.in_('id', incoming_ids).execute()
        else:
            supabase.table('personas').delete().eq('user_id', user_id).execute()
        
        cursor.execute("UPDATE users SET settings = ? WHERE id = ?", (json.dumps(current_settings), user_id))
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
        # Upsert incoming
        for p in incoming_personas:
            supabase.table('personas').upsert({
                'id': p.get('id') or str(uuid.uuid4()),
                'user_id': user_id,
                'name': p['name'],
                'role': p.get('role', 'Member'),
                'color': p.get('color', '#6366f1'),
                'weekly_capacity_hours': p.get('capacityLimit', 40),
                'allow_overload': p.get('allowOverload', False)
            }).execute()
        
    elif section in ['envoy', 'visuals', 'experimental']:
        current_settings[section] = payload
    
    supabase.table('users').update({'settings': json.dumps(current_settings)}).eq('id', user_id).execute()
    return {"status": "success"}

@app.get('/projects')
async def get_projects():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM projects")
        rows = cursor.fetchall()
        projects = []
        for row in rows:
            p = dict(row)
            if 'pk' in p: del p['pk']
            p['visible'] = bool(p['visible'])
            projects.append(p)
        return projects
    finally:
        conn.close()
    res = supabase.table('projects').select('*').execute()
    projects = []
    for row in res.data:
        p = dict(row)
        if 'pk' in p: del p['pk']
        p['visible'] = bool(p.get('visible', True))
        projects.append(p)
    return projects

@app.post('/createProject')
async def create_project(project: ProjectCreate):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        project_id = str(uuid.uuid4())
        cursor.execute("INSERT INTO projects (id, name) VALUES (?, ?)", (project_id, project.name))
        conn.commit()
        if project.userId:
            log_event(cursor, project.userId, 'status_change', project.name, 'created project')
        return {"id": project_id, "name": project.name, "visible": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
    project_id = str(uuid.uuid4())
    supabase.table('projects').insert({'id': project_id, 'name': project.name}).execute()
    if project.userId:
        log_event(project.userId, 'status_change', project.name, 'created project')
    return {"id": project_id, "name": project.name, "visible": True}

@app.post('/deleteProject')
async def delete_project(project: ProjectDelete):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM tasks WHERE projectId = ?", (project.id,))
        cursor.execute("SELECT name FROM projects WHERE id = ?", (project.id,))
        row = cursor.fetchone()
        if row and project.userId:
            log_event(cursor, project.userId, 'status_change', row[0], 'deleted project')
        cursor.execute("DELETE FROM projects WHERE id = ?", (project.id,))
        conn.commit()
        return {"message": "Project deleted successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
    supabase.table('tasks').delete().eq('projectId', project.id).execute()
    
    res = supabase.table('projects').select('name').eq('id', project.id).execute()
    if res.data and project.userId:
        log_event(project.userId, 'status_change', res.data[0]['name'], 'deleted project')
        
    supabase.table('projects').delete().eq('id', project.id).execute()
    return {"message": "Project deleted successfully"}

@app.get('/renderTask')
async def renderTask():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        # 1. Fetch all tasks with owner info
        cursor.execute("""
            SELECT 
                t.*, 
                u.firstName, 
                u.lastName,
                (SELECT count(*) FROM dependencies WHERE to_task_id = t.id AND type = 'blocked_by') as blocked_by_count,
                (SELECT count(*) FROM dependencies WHERE to_task_id = t.id AND type = 'waiting_on') as waiting_on_count,
                (SELECT count(*) FROM dependencies WHERE to_task_id = t.id AND type = 'helpful_if_done_first') as helpful_if_done_first_count
            FROM tasks t 
            LEFT JOIN users u ON t.ownerId = u.id
        """)
        rows = cursor.fetchall()
        tasks = []
        if not rows:
            return []

        tasks_map = {}
        for row in rows:
            task_dict = dict(row)
            # Parse JSON fields
            try:
                task_dict['dependencyIds'] = json.loads(task_dict['dependencyIds']) if task_dict['dependencyIds'] else []
                task_dict['tags'] = json.loads(task_dict['tags']) if task_dict['tags'] else []
            except (json.JSONDecodeError, TypeError):
                task_dict['dependencyIds'] = []
                task_dict['tags'] = []

            if 'pk' in task_dict:
                del task_dict['pk']
    # 1. Fetch all tasks
    tasks_res = supabase.table('tasks').select('*').execute()
    tasks_data = tasks_res.data
    
    # Fetch users for owner names
    users_res = supabase.table('users').select('id, firstName, lastName').execute()
    users_map = {u['id']: u for u in users_res.data}
    
    # Fetch dependencies for counts
    deps_res = supabase.table('dependencies').select('*').execute()
    deps_data = deps_res.data
    
    tasks_map = {}
    for t in tasks_data:
        # Parse JSON fields if they are strings
        if isinstance(t.get('dependencyIds'), str):
            try: t['dependencyIds'] = json.loads(t['dependencyIds'])
            except: t['dependencyIds'] = []
        if isinstance(t.get('tags'), str):
            try: t['tags'] = json.loads(t['tags'])
            except: t['tags'] = []
            
            # Add ownerName
            fname = task_dict.pop('firstName', None)
            lname = task_dict.pop('lastName', None)
            if fname or lname:
                task_dict['ownerName'] = f"{fname or ''} {lname or ''}".strip()
            else:
                task_dict['ownerName'] = "Unknown"
            task_dict['ownerName'] = f"{fname or ''} {lname or ''}".strip() or "Unknown"
        if 'pk' in t: del t['pk']
        
        # Add ownerName
        owner = users_map.get(t['ownerId'])
        if owner:
            t['ownerName'] = f"{owner.get('firstName') or ''} {owner.get('lastName') or ''}".strip()
        else:
            t['ownerName'] = "Unknown"
            
        # Counts
        t['blocked_by_count'] = sum(1 for d in deps_data if d['to_task_id'] == t['id'] and d['type'] == 'blocked_by')
        t['waiting_on_count'] = sum(1 for d in deps_data if d['to_task_id'] == t['id'] and d['type'] == 'waiting_on')
        t['helpful_if_done_first_count'] = sum(1 for d in deps_data if d['to_task_id'] == t['id'] and d['type'] == 'helpful_if_done_first')
        
        t['dependents'] = []
        tasks_map[t['id']] = t
        
    dependents_ids = set()
    for dep in deps_data:
        from_id = dep['from_task_id']
        to_id = dep['to_task_id']
        if from_id in tasks_map and to_id in tasks_map:
            if to_id in dependents_ids: continue
            
            dep_task = tasks_map[to_id].copy()
            dep_task['dependencyNote'] = dep.get('note')
            dep_task['dependencyType'] = dep.get('type')
            
            tasks_map[from_id]['dependents'].append(dep_task)
            dependents_ids.add(to_id)
            
    final_tasks = [t for tid, t in tasks_map.items() if tid not in dependents_ids]
    return final_tasks

            # Initialize dependents array
            task_dict['dependents'] = []
            tasks_map[task_dict['id']] = task_dict

        # 2. Fetch all dependencies and build the tree
        cursor.execute("SELECT from_task_id, to_task_id, type, note FROM dependencies")
        dependencies_rows = cursor.fetchall()

        dependents_ids = set()
        for dep in dependencies_rows:
            from_id, to_id = dep['from_task_id'], dep['to_task_id']
            if from_id in tasks_map and to_id in tasks_map:
                # Prevent task from being added as a dependent multiple times (avoids duplication)
                if to_id in dependents_ids:
                    continue

                # Create a copy to attach dependency-specific info (note/type) without polluting the original task
                dep_task = tasks_map[to_id].copy()
                dep_task['dependencyNote'] = dep['note']
                dep_task['dependencyType'] = dep['type']
                
                tasks_map[from_id]['dependents'].append(dep_task)
                dependents_ids.add(to_id)

        # 3. Return only top-level tasks (those that are not dependents)
        final_tasks = [task for task_id, task in tasks_map.items() if task_id not in dependents_ids]

        return final_tasks
    except Exception as e:
        print(f"Error rendering tasks: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.post('/createTask')
async def createTask(task: Task):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id FROM tasks WHERE id = ?", (task.id,))
        exists = cursor.fetchone()
        action_desc = "updated task" if exists else "created a new task"

        cursor.execute('''
            INSERT OR REPLACE INTO tasks (
                id, projectId, title, startDate, duration, 
                plannedDuration, progress, status, priority, 
                ownerId, personaId, dependencyIds, tags
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            task.id, task.projectId, task.title, task.startDate, 
            task.duration, task.plannedDuration, task.progress, 
            task.status, task.priority, task.ownerId, task.personaId, 
            json.dumps(task.dependencyIds), json.dumps(task.tags)
        ))
    res = supabase.table('tasks').select('id').eq('id', task.id).execute()
    exists = bool(res.data)
    action_desc = "updated task" if exists else "created a new task"
    
    data = task.dict()
    data['dependencyIds'] = json.dumps(task.dependencyIds)
    data['tags'] = json.dumps(task.tags)
    if 'ownerName' in data: del data['ownerName']
    if 'userId' in data: del data['userId']
    
    supabase.table('tasks').upsert(data).execute()
    supabase.table('users').update({'isNew': False}).eq('id', task.ownerId).execute()
    
    log_event(task.ownerId, 'status_change', task.title, action_desc)
    
    user_res = supabase.table('users').select('firstName, lastName').eq('id', task.ownerId).execute()
    if user_res.data:
        u = user_res.data[0]
        task.ownerName = f"{u.get('firstName') or ''} {u.get('lastName') or ''}".strip()
        
        cursor.execute("UPDATE users SET isNew = 0 WHERE id = ?", (task.ownerId,))
        
        log_event(cursor, task.ownerId, 'status_change', task.title, action_desc)
        
        # Fetch owner name to ensure frontend displays initials correctly immediately
        cursor.execute("SELECT firstName, lastName FROM users WHERE id = ?", (task.ownerId,))
        user_row = cursor.fetchone()
        if user_row:
            task.ownerName = f"{user_row[0] or ''} {user_row[1] or ''}".strip()
    return task

        conn.commit()
        return task
    except Exception as e:
        print(f"Error saving task: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.post('/updateTask')
async def updateTask(task: Task):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        # Fetch old task state for better logging
        cursor.execute("SELECT status, priority, ownerId FROM tasks WHERE id = ?", (task.id,))
        old_task = cursor.fetchone()
    # Fetch old task state
    old_res = supabase.table('tasks').select('status, priority').eq('id', task.id).execute()
    old_task = old_res.data[0] if old_res.data else None
    
    data = task.dict()
    data['dependencyIds'] = json.dumps(task.dependencyIds)
    data['tags'] = json.dumps(task.tags)
    for k in ['ownerName', 'userId']:
        if k in data: del data[k]
        
        cursor.execute('''
        UPDATE tasks SET projectId=?, title=?, startDate=?, duration=?, plannedDuration=?, progress=?, status=?, priority=?, ownerId=?, personaId=?, dependencyIds=?, tags=?
        WHERE id=?
        ''',(task.projectId,task.title,task.startDate,task.duration,task.plannedDuration,task.progress,task.status,task.priority,task.ownerId,task.personaId,json.dumps(task.dependencyIds),json.dumps(task.tags),task.id))
        conn.commit()
        
        details = 'updated task'
        if old_task:
            if old_task[0] != task.status:
                details = f"moved to {task.status}"
            elif old_task[1] != task.priority:
                details = f"changed priority to {task.priority}"
        
        actor_id = task.userId if task.userId else task.ownerId
        log_event(cursor, actor_id, 'status_change', task.title, details)
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Task not found")
        return task
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
    supabase.table('tasks').update(data).eq('id', task.id).execute()
    
    details = 'updated task'
    if old_task:
        if old_task['status'] != task.status:
            details = f"moved to {task.status}"
        elif old_task['priority'] != task.priority:
            details = f"changed priority to {task.priority}"
            
    actor_id = task.userId if task.userId else task.ownerId
    log_event(actor_id, 'status_change', task.title, details)
    
    return task

@app.post('/completeTask')
async def complete_task(req: CompleteTaskRequest):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        # 1. Get Task to calculate duration
        cursor.execute("SELECT startDate, title FROM tasks WHERE id = ?", (req.taskId,))
        task = cursor.fetchone()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
    res = supabase.table('tasks').select('startDate, title').eq('id', req.taskId).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Task not found")
    task = res.data[0]
    
    start_time = task['startDate'] if task['startDate'] else int(datetime.now().timestamp())
    end_time = int(datetime.now().timestamp())
    duration_seconds = end_time - start_time
    
    supabase.table('tasks').update({'status': 'Done', 'progress': 100, 'completedAt': end_time}).eq('id', req.taskId).execute()
    
    user_res = supabase.table('users').select('avg_task_completion_time, completed_tasks_count').eq('id', req.userId).execute()
    new_avg = 0
    if user_res.data:
        user = user_res.data[0]
        old_avg = user['avg_task_completion_time'] or 0
        old_count = user['completed_tasks_count'] or 0
        new_count = old_count + 1
        new_avg = ((old_avg * old_count) + duration_seconds) / new_count
        supabase.table('users').update({'avg_task_completion_time': new_avg, 'completed_tasks_count': new_count}).eq('id', req.userId).execute()
        
        start_time = task['startDate'] if task['startDate'] else int(datetime.now().timestamp())
        end_time = int(datetime.now().timestamp())
        duration_seconds = end_time - start_time
        
        # 2. Update Task
        cursor.execute("UPDATE tasks SET status = 'Done', progress = 100, completedAt = ? WHERE id = ?", (end_time, req.taskId))
        
        # 3. Update User Stats
        cursor.execute("SELECT avg_task_completion_time, completed_tasks_count FROM users WHERE id = ?", (req.userId,))
        user = cursor.fetchone()
        new_avg = 0
        if user:
            old_avg = user['avg_task_completion_time'] or 0
            old_count = user['completed_tasks_count'] or 0
            new_count = old_count + 1
            new_avg = ((old_avg * old_count) + duration_seconds) / new_count
            cursor.execute("UPDATE users SET avg_task_completion_time = ?, completed_tasks_count = ? WHERE id = ?", (new_avg, new_count, req.userId))
        
        log_event(cursor, req.userId, 'status_change', task['title'], 'completed task')
        conn.commit()
        return {"message": "Task completed", "new_avg_time": new_avg}
    except Exception as e:
        conn.rollback()
        print(f"Error completing task: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
    log_event(req.userId, 'status_change', task['title'], 'completed task')
    return {"message": "Task completed", "new_avg_time": new_avg}

@app.post('/deleteTask')
async def delete_task(req: DeleteRequest):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT title FROM tasks WHERE id = ?", (req.id,))
        row = cursor.fetchone()
        task_title = row[0] if row else "Unknown Task"
    res = supabase.table('tasks').select('title').eq('id', req.id).execute()
    task_title = res.data[0]['title'] if res.data else "Unknown Task"
    
    supabase.table('tasks').delete().eq('id', req.id).execute()
    
    if req.userId:
        log_event(req.userId, 'status_change', task_title, 'Task Deleted')
        
    return {"message": "Task was successfully deleted"}

        cursor.execute("DELETE FROM tasks WHERE id = ?", (req.id,))
        
        # Logging the events
        if req.userId:
            log_event(cursor, req.userId, 'status_change', task_title, 'Task Deleted')
        
        conn.commit()
        return {"message": "Task was successfully deleted"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
@app.post("/dependencies")
async def create_dependency(dep: DependencyCreate):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        dep_id = str(uuid.uuid4())
        created_at = int(datetime.now(timezone.utc).timestamp())
        cursor.execute(
            "INSERT INTO dependencies (id, from_task_id, to_task_id, type, note, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (dep_id, dep.from_task_id, dep.to_task_id, dep.type.value, dep.note, created_at)
        )
    dep_id = str(uuid.uuid4())
    created_at = int(datetime.now(timezone.utc).timestamp())
    
    supabase.table('dependencies').insert({
        'id': dep_id,
        'from_task_id': dep.from_task_id,
        'to_task_id': dep.to_task_id,
        'type': dep.type.value,
        'note': dep.note,
        'created_at': created_at
    }).execute()
    
    update_task_status_after_dependency_change(dep.to_task_id)
    
    from_res = supabase.table('tasks').select('title').eq('id', dep.from_task_id).execute()
    to_res = supabase.table('tasks').select('title').eq('id', dep.to_task_id).execute()
    
    if from_res.data and to_res.data:
        details = f"set '{to_res.data[0]['title']}' as dependent on '{from_res.data[0]['title']}'"
        log_event(dep.userId, 'dependency_change', to_res.data[0]['title'], details)
        
        update_task_status_after_dependency_change(cursor, dep.to_task_id)
    return {"id": dep_id, **dep.dict()}

        from_task_title_row = cursor.execute("SELECT title FROM tasks WHERE id = ?", (dep.from_task_id,)).fetchone()
        to_task_title_row = cursor.execute("SELECT title FROM tasks WHERE id = ?", (dep.to_task_id,)).fetchone()
        if from_task_title_row and to_task_title_row:
            details = f"set '{to_task_title_row[0]}' as dependent on '{from_task_title_row[0]}'"
            log_event(cursor, dep.userId, 'dependency_change', to_task_title_row[0], details)

        conn.commit()
        return {"id": dep_id, **dep.dict()}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/tasks/{task_id}/dependencies")
async def get_task_dependencies(task_id: str):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        # Dependencies where this task is blocked by others
        cursor.execute("""
            SELECT d.id, d.type, d.note, d.from_task_id, t.title as from_task_title, t.status as from_task_status
            FROM dependencies d
            JOIN tasks t ON d.from_task_id = t.id
            WHERE d.to_task_id = ?
        """, (task_id,))
        blocked_by = [dict(row) for row in cursor.fetchall()]
    blocked_res = supabase.table('dependencies').select('*').eq('to_task_id', task_id).execute()
    blocked_data = blocked_res.data
    
    blocking_res = supabase.table('dependencies').select('*').eq('from_task_id', task_id).execute()
    blocking_data = blocking_res.data
    
    ids = set()
    for d in blocked_data: ids.add(d['from_task_id'])
    for d in blocking_data: ids.add(d['to_task_id'])
    
    tasks_map = {}
    if ids:
        t_res = supabase.table('tasks').select('id, title, status').in_('id', list(ids)).execute()
        tasks_map = {t['id']: t for t in t_res.data}
        
    for d in blocked_data:
        t = tasks_map.get(d['from_task_id'])
        d['from_task_title'] = t['title'] if t else None
        d['from_task_status'] = t['status'] if t else None
        
    for d in blocking_data:
        t = tasks_map.get(d['to_task_id'])
        d['to_task_title'] = t['title'] if t else None
        d['to_task_status'] = t['status'] if t else None
        
    return {"blocked_by": blocked_data, "blocking": blocking_data}

        # Dependencies where this task blocks others
        cursor.execute("""
            SELECT d.id, d.type, d.note, d.to_task_id, t.title as to_task_title, t.status as to_task_status
            FROM dependencies d
            JOIN tasks t ON d.to_task_id = t.id
            WHERE d.from_task_id = ?
        """, (task_id,))
        blocking = [dict(row) for row in cursor.fetchall()]

        return {"blocked_by": blocked_by, "blocking": blocking}
    finally:
        conn.close()

@app.post("/dependencies/lookup")
async def lookup_dependency(data: DependencyLookup):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM dependencies WHERE from_task_id = ? AND to_task_id = ?", (data.from_task_id, data.to_task_id))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Dependency not found")
        return dict(row)
    finally:
        conn.close()
    res = supabase.table('dependencies').select('*').eq('from_task_id', data.from_task_id).eq('to_task_id', data.to_task_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Dependency not found")
    return res.data[0]

@app.patch("/dependencies/{dependency_id}")
async def update_dependency(dependency_id: str, dep_update: DependencyUpdate):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT to_task_id FROM dependencies WHERE id = ?", (dependency_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Dependency not found")
        task_id = row[0]

        updates = []
        params = []
        if dep_update.type:
            updates.append("type = ?")
            params.append(dep_update.type.value)
        if dep_update.note is not None:
            updates.append("note = ?")
            params.append(dep_update.note)
    res = supabase.table('dependencies').select('to_task_id').eq('id', dependency_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Dependency not found")
    task_id = res.data[0]['to_task_id']
    
    updates = {}
    if dep_update.type: updates['type'] = dep_update.type.value
    if dep_update.note is not None: updates['note'] = dep_update.note
    
    if not updates:
        raise HTTPException(status_code=400, detail="No update fields provided")
        
        if not updates:
            raise HTTPException(status_code=400, detail="No update fields provided")
    supabase.table('dependencies').update(updates).eq('id', dependency_id).execute()
    update_task_status_after_dependency_change(task_id)
    return {"message": "Dependency updated successfully"}

        params.append(dependency_id)
        cursor.execute(f"UPDATE dependencies SET {', '.join(updates)} WHERE id = ?", tuple(params))

        update_task_status_after_dependency_change(cursor, task_id)
        conn.commit()
        return {"message": "Dependency updated successfully"}
    finally:
        conn.close()

@app.delete("/dependencies/{dependency_id}/{user_id}")
async def delete_dependency(dependency_id: str, user_id: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT from_task_id, to_task_id FROM dependencies WHERE id = ?", (dependency_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Dependency not found")
        from_task_id, to_task_id = row

        cursor.execute("DELETE FROM dependencies WHERE id = ?", (dependency_id,))
    res = supabase.table('dependencies').select('from_task_id, to_task_id').eq('id', dependency_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Dependency not found")
    dep = res.data[0]
    
    supabase.table('dependencies').delete().eq('id', dependency_id).execute()
    update_task_status_after_dependency_change(dep['to_task_id'])
    
    from_res = supabase.table('tasks').select('title').eq('id', dep['from_task_id']).execute()
    to_res = supabase.table('tasks').select('title').eq('id', dep['to_task_id']).execute()
    
    if from_res.data and to_res.data:
        details = f"removed dependency between '{to_res.data[0]['title']}' and '{from_res.data[0]['title']}'"
        log_event(user_id, 'dependency_change', to_res.data[0]['title'], details)
        
        update_task_status_after_dependency_change(cursor, to_task_id)
    return {"message": "Dependency deleted successfully"}

        from_task_title_row = cursor.execute("SELECT title FROM tasks WHERE id = ?", (from_task_id,)).fetchone()
        to_task_title_row = cursor.execute("SELECT title FROM tasks WHERE id = ?", (to_task_id,)).fetchone()
        if from_task_title_row and to_task_title_row:
            details = f"removed dependency between '{to_task_title_row[0]}' and '{from_task_title_row[0]}'"
            log_event(cursor, user_id, 'dependency_change', to_task_title_row[0], details)

        conn.commit()
        return {"message": "Dependency deleted successfully"}
    finally:
        conn.close()

@app.get("/tasks/{task_id}/dependency-summary")
async def get_dependency_summary(task_id: str):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT type, count(*) as count FROM dependencies WHERE to_task_id = ? GROUP BY type", (task_id,))
        counts = {row['type']: row['count'] for row in cursor.fetchall()}
    res = supabase.table('dependencies').select('*').eq('to_task_id', task_id).execute()
    deps = res.data
    
    counts = {}
    waiting_notes = []
    blocked_by_ids = []
    
    for d in deps:
        counts[d['type']] = counts.get(d['type'], 0) + 1
        if d['type'] == 'waiting_on' and d.get('note'):
            waiting_notes.append(d['note'])
        if d['type'] == 'blocked_by':
            blocked_by_ids.append(d['from_task_id'])
            
    blocking_tasks = []
    if blocked_by_ids:
        t_res = supabase.table('tasks').select('title').in_('id', blocked_by_ids).neq('status', 'Done').execute()
        blocking_tasks = [t['title'] for t in t_res.data]
        
    return {
        "blocked_by_count": counts.get('blocked_by', 0),
        "waiting_on_count": counts.get('waiting_on', 0),
        "helpful_if_done_first_count": counts.get('helpful_if_done_first', 0),
        "blocking_tasks": blocking_tasks,
        "waiting_notes": waiting_notes
    }

        cursor.execute("""
            SELECT t.title FROM tasks t
            JOIN dependencies d ON t.id = d.from_task_id
            WHERE d.to_task_id = ? AND d.type = 'blocked_by' AND t.status != 'Done'
        """, (task_id,))
        blocking_tasks = [row['title'] for row in cursor.fetchall()]

        cursor.execute("SELECT note FROM dependencies WHERE to_task_id = ? AND type = 'waiting_on' AND note IS NOT NULL", (task_id,))
        waiting_notes = [row['note'] for row in cursor.fetchall()]

        return {
            "blocked_by_count": counts.get('blocked_by', 0),
            "waiting_on_count": counts.get('waiting_on', 0),
            "helpful_if_done_first_count": counts.get('helpful_if_done_first', 0),
            "blocking_tasks": blocking_tasks,
            "waiting_notes": waiting_notes
        }
    finally:
        conn.close()

# -----------------------------
# Gemini Suggest Endpoint
# -----------------------------
@app.get("/envoy/task/{task_id}/friction")
async def get_envoy_friction(task_id: str):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        # Blockers
        cursor.execute("""
            SELECT t.title, u.firstName, u.lastName
            FROM dependencies d
            JOIN tasks t ON d.from_task_id = t.id
            JOIN users u ON t.ownerId = u.id
            WHERE d.to_task_id = ? AND d.type = 'blocked_by' AND t.status != 'Done'
        """, (task_id,))
        blockers = [f"{row['title']} (owned by {row['firstName']})" for row in cursor.fetchall()]
    # Blockers
    d_res = supabase.table('dependencies').select('from_task_id').eq('to_task_id', task_id).eq('type', 'blocked_by').execute()
    from_ids = [d['from_task_id'] for d in d_res.data]
    
    blockers = []
    if from_ids:
        t_res = supabase.table('tasks').select('title, status, ownerId').in_('id', from_ids).neq('status', 'Done').execute()
        tasks = t_res.data
        if tasks:
            owner_ids = [t['ownerId'] for t in tasks]
            u_res = supabase.table('users').select('id, firstName, lastName').in_('id', owner_ids).execute()
            u_map = {u['id']: u for u in u_res.data}
            
            for t in tasks:
                u = u_map.get(t['ownerId'])
                name = f"{u.get('firstName')} {u.get('lastName')}" if u else "Unknown"
                blockers.append(f"{t['title']} (owned by {name})")
                
    # External waits
    w_res = supabase.table('dependencies').select('note').eq('to_task_id', task_id).eq('type', 'waiting_on').neq('note', None).execute()
    external_waits = [d['note'] for d in w_res.data]
    
    # Soft dependencies
    s_res = supabase.table('dependencies').select('from_task_id').eq('to_task_id', task_id).eq('type', 'helpful_if_done_first').execute()
    s_ids = [d['from_task_id'] for d in s_res.data]
    soft_dependencies = []
    if s_ids:
        t_res = supabase.table('tasks').select('title').in_('id', s_ids).neq('status', 'Done').execute()
        soft_dependencies = [t['title'] for t in t_res.data]
        
    return { "blockers": blockers, "external_waits": external_waits, "soft_dependencies": soft_dependencies }

        # External Waits
        cursor.execute("SELECT note FROM dependencies WHERE to_task_id = ? AND type = 'waiting_on' AND note IS NOT NULL", (task_id,))
        external_waits = [row['note'] for row in cursor.fetchall()]

        # Soft Dependencies
        cursor.execute("""
            SELECT t.title FROM tasks t
            JOIN dependencies d ON t.id = d.from_task_id
            WHERE d.to_task_id = ? AND d.type = 'helpful_if_done_first' AND t.status != 'Done'
        """, (task_id,))
        soft_dependencies = [row['title'] for row in cursor.fetchall()]

        return { "blockers": blockers, "external_waits": external_waits, "soft_dependencies": soft_dependencies }
    finally:
        conn.close()



@app.post("/envoy/suggest")
async def suggest(req: EnvoyRequest, request: Request):
    user_identifier = request.client.host 

    if is_rate_limited(user_identifier):
        raise HTTPException(
            status_code=429, 
            detail="Too many AI requests. Please wait a minute before trying again."
        )

    # 2. Fetch a snapshot of tasks from the DB
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    if req.all:
        cursor.execute(
            "SELECT id, title, status, priority, plannedDuration, dependencyIds "
            "FROM tasks WHERE projectId = (SELECT projectId FROM tasks WHERE id = ?)",
            (req.task_id,),
        )
        t_res = supabase.table('tasks').select('projectId').eq('id', req.task_id).execute()
        if t_res.data:
            pid = t_res.data[0]['projectId']
            res = supabase.table('tasks').select('id, title, status, priority, plannedDuration, dependencyIds').eq('projectId', pid).execute()
            rows = res.data
        else:
            rows = []
    else:
        cursor.execute(
            "SELECT id, title, status, priority, plannedDuration, dependencyIds "
            "FROM tasks WHERE id = ?",
            (req.task_id,),
        )
        res = supabase.table('tasks').select('id, title, status, priority, plannedDuration, dependencyIds').eq('id', req.task_id).execute()
        rows = res.data

    rows = cursor.fetchall()
    conn.close()

    tasks_list = [{
        "id": row[0],
        "title": row[1],
        "status": row[2],
        "priority": row[3],
        "plannedDuration": row[4],
        "dependencyIds": row[5],
        "id": row['id'],
        "title": row['title'],
        "status": row['status'],
        "priority": row['priority'],
        "plannedDuration": row['plannedDuration'],
        "dependencyIds": row['dependencyIds'],
    } for row in rows]

    # 3. Call the unified AI engine (ASUS → Mini → Gemini)
    try:
        parsed = await generate_envoy_proposals(tasks_list, req.context_text)
    except Exception as e:
        print("Envoy AI failed:", e)
        return {"error": "Envoy AI engine failed"}

    # 4. Normalize proposals into your API shape
    proposals = []
    if isinstance(parsed, list):
        for p in parsed:
            if isinstance(p, dict):
                proposals.append({
                    "id": str(uuid.uuid4()),
                    "field": p.get("field", ""),
                    "suggested": p.get("suggested", ""),
                    "reason": p.get("reason", "")
                })

    return {
        "task_id": req.task_id,
        "proposals": proposals
    }


# -----------------------------
# Envoy Apply Endpoint
# -----------------------------
IMMUTABLE_FIELDS = {"pk", "id", "projectId", "ownerId", "personaId", "progress", "createdAt"}
AI_MUTABLE_FIELDS = {"status", "priority"}
AI_OPTIONAL_FIELDS = {"startDate", "duration", "plannedDuration", "dependencyIds", "tags"}



@app.post("/envoy/apply")
def apply(req: EnvoyRequest):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Fetch task details for logging
    cursor.execute("SELECT title, ownerId FROM tasks WHERE id = ?", (req.task_id,))
    task_row = cursor.fetchone()
    task_title = task_row[0] if task_row else "Unknown Task"
    owner_id = task_row[1] if task_row else "unknown"
    res = supabase.table('tasks').select('title, ownerId').eq('id', req.task_id).execute()
    task = res.data[0] if res.data else None
    task_title = task['title'] if task else "Unknown Task"
    owner_id = task['ownerId'] if task else "unknown"

    applied = []
    skipped_fields = [] # Renamed for clarity as it now includes invalid data

    try:
        for p in req.proposals or []:
            field = p.field
            suggested = p.suggested

            # 1. Check if the field is even allowed to be changed by AI
            if field not in AI_MUTABLE_FIELDS and field not in AI_OPTIONAL_FIELDS:
                skipped_fields.append(f"{field} (immutable)")
                continue

            # 2. Data Validation Layer
            # Prevent AI from setting statuses or priorities that don't exist
            if field == "status" and suggested not in VALID_STATUS:
                skipped_fields.append(f"{field} (invalid value: {suggested})")
                continue
            
            if field == "priority" and suggested not in VALID_PRIORITY:
                skipped_fields.append(f"{field} (invalid value: {suggested})")
                continue

            # 3. Apply the update
            val = json.dumps(suggested) if isinstance(suggested, list) else suggested
            query = f"UPDATE tasks SET {field} = ? WHERE id = ?"
            cursor.execute(query, (val, req.task_id))
            supabase.table('tasks').update({field: val}).eq('id', req.task_id).execute()
            applied.append(field)

        # 4. Log the success
        if applied:
             details = f"applied AI updates: {', '.join(applied)}"
             log_event(cursor, owner_id, 'status_change', task_title, details)
             log_event(owner_id, 'status_change', task_title, details)

        conn.commit()
        return {
            "status": "success",
            "message": "Task update processed",
            "applied_fields": applied,
            "skipped_fields": skipped_fields
        }

    except Exception as e:
        conn.rollback()
        print(f"Apply Error: {e}")
        return {"error": str(e)}

    finally:
        conn.close()


@app.get('/renderPersona')
async def renderPersona():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM personas")
        rows = cursor.fetchall()
        personas = []
        for row in rows:
            persona_dict = dict(row)
            if 'pk' in persona_dict:
                del persona_dict['pk']
            personas.append(persona_dict)
        return personas
    finally:
        conn.close()
    res = supabase.table('personas').select('*').execute()
    personas = []
    for row in res.data:
        persona_dict = dict(row)
        if 'pk' in persona_dict:
            del persona_dict['pk']
        personas.append(persona_dict)
    return personas

@app.post('/createPersona')
async def createPersona(p: PersonaCreate):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        new_id = str(uuid.uuid4())
        cursor.execute("INSERT INTO personas (id, user_id, name, weekly_capacity_hours) VALUES (?, ?, ?, ?)", 
                       (new_id, p.user_id, p.name, p.weekly_capacity_hours))
        conn.commit()
        return {**p.dict(), "id": new_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
    new_id = str(uuid.uuid4())
    data = p.dict()
    data['id'] = new_id
    supabase.table('personas').insert(data).execute()
    return data

@app.post('/deletePersona')
async def deletePersona(data: PersonaDelete): 
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM personas WHERE id = ?", (data.id,))
        conn.commit()        
        if cursor.rowcount == 0:
            return {"message": "Persona not found, nothing deleted"}
        return {"message": "Persona deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
    res = supabase.table('personas').delete().eq('id', data.id).execute()
    if not res.data:
        return {"message": "Persona not found, nothing deleted"}
    return {"message": "Persona deleted successfully"}

@app.post('/team/add_member')
async def add_team_member(req: AddMemberRequest):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        # 1. Verify Requester is Admin
        cursor.execute("SELECT role, companyName FROM users WHERE id = ?", (req.userId,))
        admin = cursor.fetchone()
    # 1. Verify Requester is Admin
    res = supabase.table('users').select('role, companyName').eq('id', req.userId).execute()
    if not res.data:
         raise HTTPException(status_code=404, detail="Requester not found")
    admin = res.data[0]
        
        if not admin:
             raise HTTPException(status_code=404, detail="Requester not found")
             
        if admin['role'] != 'admin':
            raise HTTPException(status_code=403, detail="Only admins can add team members")
            
        if not admin['companyName']:
            raise HTTPException(status_code=400, detail="Admin must belong to a company/organization")
    if admin['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Only admins can add team members")
        
    if not admin['companyName']:
        raise HTTPException(status_code=400, detail="Admin must belong to a company/organization")

        # 2. Find Target User & Update
        cursor.execute("UPDATE users SET companyName = ? WHERE username = ?", (admin['companyName'], req.username))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="User with this username not found")
            
        conn.commit()
        log_event(cursor, req.userId, 'status_change', 'Team', f"added {req.username}")
        return {"message": f"User {req.username} added to {admin['companyName']}"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
    # 2. Find Target User & Update
    u_res = supabase.table('users').update({'companyName': admin['companyName']}).eq('username', req.username).execute()
    if not u_res.data:
        raise HTTPException(status_code=404, detail="User with this username not found")
        
    log_event(req.userId, 'status_change', 'Team', f"added {req.username}")
    return {"message": f"User {req.username} added to {admin['companyName']}"}

@app.post('/team/update_skills')
async def update_skills(req: UpdateSkillsRequest):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        # Check requester role
        cursor.execute("SELECT role, companyName FROM users WHERE id = ?", (req.requesterId,))
        requester = cursor.fetchone()
    # Check requester role
    res = supabase.table('users').select('role, companyName').eq('id', req.requesterId).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Requester not found")
    requester = res.data[0]

    # Allow if updating self OR if requester is admin
    if req.requesterId != req.targetUserId:
        if requester['role'] != 'admin':
             raise HTTPException(status_code=403, detail="Unauthorized")
        
        if not requester:
            raise HTTPException(status_code=404, detail="Requester not found")
    supabase.table('users').update({'skills': json.dumps(req.skills)}).eq('id', req.targetUserId).execute()
    return {"message": "Skills updated"}

        # Allow if updating self OR if requester is admin
        if req.requesterId != req.targetUserId:
            if requester['role'] != 'admin':
                 raise HTTPException(status_code=403, detail="Unauthorized")
            
        cursor.execute("UPDATE users SET skills = ? WHERE id = ?", (json.dumps(req.skills), req.targetUserId))
        conn.commit()
        return {"message": "Skills updated"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get('/team/overview')
async def team_overview(userId: str):
    # Mock metrics for now, in production calculate from tasks/interventions
    return {
        "coordinationDebt": "Medium",
        "leakageScore": 12,
        "dependencyRisk": "High"
    }

@app.get('/team/members')
async def team_members(userId: str):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        # Get user's company
        cursor.execute("SELECT companyName FROM users WHERE id = ?", (userId,))
        user = cursor.fetchone()
        if not user or not user['companyName']:
            return []
        
        company = user['companyName']
        cursor.execute("SELECT id, firstName, lastName, role, avg_task_completion_time, completed_tasks_count, skills FROM users WHERE companyName = ?", (company,))
        rows = cursor.fetchall()
        
        members = []
        for row in rows:
            try:
                skills = json.loads(row['skills']) if row['skills'] else []
            except:
                skills = []
    # Get user's company
    res = supabase.table('users').select('companyName').eq('id', userId).execute()
    if not res.data or not res.data[0]['companyName']:
        return []
    
    company = res.data[0]['companyName']
    m_res = supabase.table('users').select('id, firstName, lastName, role, avg_task_completion_time, completed_tasks_count, skills').eq('companyName', company).execute()
    rows = m_res.data
    
    members = []
    for row in rows:
        try:
            skills = json.loads(row['skills']) if row.get('skills') else []
        except:
            skills = []

            # Calculate mock scores based on real data if available
            members.append({
                "id": row['id'],
                "name": f"{row['firstName']} {row['lastName']}",
                "role": row['role'],
                "skills": skills,
                "avgTime": row['avg_task_completion_time'],
                "completedCount": row['completed_tasks_count'],
                "attentionScore": 85, # Placeholder
                "dependencyLoad": 3   # Placeholder
            })
        return members
    finally:
        conn.close()
        # Calculate mock scores based on real data if available
        members.append({
            "id": row['id'],
            "name": f"{row['firstName']} {row['lastName']}",
            "role": row['role'],
            "skills": skills,
            "avgTime": row['avg_task_completion_time'],
            "completedCount": row['completed_tasks_count'],
            "attentionScore": 85, # Placeholder
            "dependencyLoad": 3   # Placeholder
        })
    return members

@app.get('/pulse/events')
async def get_pulse_events():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        # Fetch latest 20 events with user info
        cursor.execute('''
            SELECT a.id, a.userId, u.username, a.type, a.targetTask, a.details, a.timestamp 
            FROM activity_log a
            JOIN users u ON a.userId = u.id
            ORDER BY a.timestamp DESC LIMIT 20
        ''')
        rows = cursor.fetchall()
    # Fetch latest 20 events
    res = supabase.table('activity_log').select('*').order('timestamp', desc=True).limit(20).execute()
    logs = res.data
    
    user_ids = list(set(l['userId'] for l in logs))
    users_map = {}
    if user_ids:
        u_res = supabase.table('users').select('id, username').in_('id', user_ids).execute()
        users_map = {u['id']: u for u in u_res.data}
        
        events = []
        for row in rows:
            events.append({
                "id": row[0],
                "actor": {"name": row[2], "avatar": f"https://ui-avatars.com/api/?name={row[2]}"},
                "type": row[3],
                "targetTask": row[4],
                "details": row[5],
                "timestamp": time_ago(row[6]) 
            })
        return events
    finally:
        conn.close()
    events = []
    for row in logs:
        u = users_map.get(row['userId'])
        username = u['username'] if u else "Unknown"
        events.append({
            "id": row['id'],
            "actor": {"name": username, "avatar": f"https://ui-avatars.com/api/?name={username}"},
            "type": row['type'],
            "targetTask": row['targetTask'],
            "details": row['details'],
            "timestamp": time_ago(row['timestamp']) 
        })
    return events

@app.get('/envoy/interventions')
async def get_interventions(userId: str):
    # Return mock interventions for UI demo
    return [
        {"id": "1", "type": "warning", "message": "Ownership ambiguous for Feature X", "scope": "team"},
        {"id": "2", "type": "critical", "message": "Person A is a dependency bottleneck", "scope": "team"},
        {"id": "3", "type": "info", "message": "You are context-switching across 5 workstreams", "scope": "personal"}
    ]

@app.post('/envoy/auto-balance')
async def auto_balance(req: AutoBalanceRequest):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        # 1. Determine User Role and Context
        cursor.execute("SELECT role, companyName FROM users WHERE id = ?", (req.userId,))
        user_info = cursor.fetchone()
        role = user_info['role'] if user_info else 'user'
        company = user_info['companyName'] if user_info else None

        if role == 'admin' and company:
            # --- ADMIN LOGIC: Team Balance ---
            # Fetch all team members
            cursor.execute("SELECT id, firstName, avg_task_completion_time, completed_tasks_count, skills FROM users WHERE companyName = ?", (company,))
            team_members = []
            for row in cursor.fetchall():
                m = dict(row)
                try:
                    m['skills'] = json.loads(m['skills']) if m['skills'] else []
                except:
                    m['skills'] = []
                team_members.append(m)
            
            # Fetch all tasks for the team (tasks owned by any team member)
            member_ids = [m['id'] for m in team_members]
            placeholders = ','.join('?' * len(member_ids))
            cursor.execute(f"SELECT * FROM tasks WHERE ownerId IN ({placeholders}) AND status != 'Done'", tuple(member_ids))
            tasks = [dict(row) for row in cursor.fetchall()]

            prompt = f"""
            You are an expert Project Manager AI.
            Goal: Redistribute tasks among team members to balance load and optimize for speed.
            Consider the 'skills' of each member and match them to the task title/requirements.
            
            Team Stats (Avg Time is in seconds, Skills are listed):
            {json.dumps(team_members)}
            
            Tasks:
            {json.dumps([{k: v for k, v in t.items() if k in ['id', 'title', 'priority', 'ownerId', 'plannedDuration']} for t in tasks])}
            
            Instructions:
            1. Assign tasks to members based on their 'avg_task_completion_time' and current load.
            2. Faster members can take more/harder tasks.
            3. MATCH SKILLS: If a task requires a skill (e.g. 'React'), assign it to a member with that skill.
            3. Return JSON: {{ "assignments": [ {{ "task_id": "...", "new_owner_id": "..." }} ] }}
            """
            
        else:
            # --- WORKER LOGIC: Persona Balance (Existing) ---
            cursor.execute("SELECT * FROM tasks WHERE ownerId = ?", (req.userId,))
            tasks = [dict(row) for row in cursor.fetchall()]
            
            cursor.execute("SELECT * FROM personas WHERE user_id = ?", (req.userId,))
            personas = [dict(row) for row in cursor.fetchall()]
            
            prompt = f"""
            You are an intelligent task manager. User ID: {req.userId}
            Current Personas (with capacity limits in hours and overload permission): 
            {json.dumps([{k: v for k, v in p.items() if k != 'pk'} for p in personas])}
            Tasks: {json.dumps([{k: v for k, v in t.items() if k != 'pk'} for t in tasks])}
            
            Goal: Organize tasks into personas to balance workload.
            1. Create new personas if needed.
            2. Assign every task to a persona. Respect 'weekly_capacity_hours' unless 'allow_overload' is true.
            3. Suggest deleting unused personas.
            
            Return JSON:
            {{
                "new_personas": [{{"name": "Name", "weekly_capacity_hours": 40}}],
                "assignments": [{{"task_id": "tid", "persona_name": "Name"}}],
                "delete_persona_ids": ["pid"]
            }}
            """
        
        client = genai.Client(api_key=GEMINI_API)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=genai.types.GenerateContentConfig(response_mime_type="application/json")
        )
        result = json.loads(response.text)
        
        # 3. Apply Changes based on Role
        if role == 'admin' and company:
            for assign in result.get("assignments", []):
                cursor.execute("UPDATE tasks SET ownerId = ? WHERE id = ?", (assign.get("new_owner_id"), assign.get("task_id")))
        else:
            # Worker Logic Application
            persona_map = {p['name']: p['id'] for p in personas}
            
            for np in result.get("new_personas", []):
                if np['name'] not in persona_map:
                    new_id = str(uuid.uuid4())
                    cursor.execute("INSERT INTO personas (id, user_id, name, weekly_capacity_hours) VALUES (?, ?, ?, ?)", 
                                   (new_id, req.userId, np['name'], np.get('weekly_capacity_hours', 40)))
                    persona_map[np['name']] = new_id

            for del_id in result.get("delete_persona_ids", []):
                cursor.execute("DELETE FROM personas WHERE id = ?", (del_id,))

            for assign in result.get("assignments", []):
                if pid := persona_map.get(assign.get("persona_name")):
                    cursor.execute("UPDATE tasks SET personaId = ? WHERE id = ?", (pid, assign.get("task_id")))

        conn.commit()
        return {"status": "success", "changes": result}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get('/team/overview')
async def team_overview(userId: str):
    # Mock metrics for now, in production calculate from tasks/interventions
    return {
        "coordinationDebt": "Medium",
        "leakageScore": 12,
        "dependencyRisk": "High"
    }

@app.get('/team/members')
async def team_members(userId: str):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        # Get user's company
        cursor.execute("SELECT companyName FROM users WHERE id = ?", (userId,))
        user = cursor.fetchone()
        if not user or not user['companyName']:
            return []
        
        company = user['companyName']
        cursor.execute("SELECT id, firstName, lastName, role, avg_task_completion_time, completed_tasks_count FROM users WHERE companyName = ?", (company,))
        rows = cursor.fetchall()
        
        members = []
        for row in rows:
            # Calculate mock scores based on real data if available
            members.append({
                "id": row['id'],
                "name": f"{row['firstName']} {row['lastName']}",
                "role": row['role'],
                "avgTime": row['avg_task_completion_time'],
                "completedCount": row['completed_tasks_count'],
                "attentionScore": 85, # Placeholder
                "dependencyLoad": 3   # Placeholder
            })
        return members
    finally:
        conn.close()

@app.get('/envoy/interventions')
async def get_interventions(userId: str):
    # Return mock interventions for UI demo
    return [
        {"id": "1", "type": "warning", "message": "Ownership ambiguous for Feature X", "scope": "team"},
        {"id": "2", "type": "critical", "message": "Person A is a dependency bottleneck", "scope": "team"},
        {"id": "3", "type": "info", "message": "You are context-switching across 5 workstreams", "scope": "personal"}
    ]

@app.post('/envoy/auto-balance')
async def auto_balance(req: AutoBalanceRequest):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        # 1. Determine User Role and Context
        cursor.execute("SELECT role, companyName FROM users WHERE id = ?", (req.userId,))
        user_info = cursor.fetchone()
        role = user_info['role'] if user_info else 'user'
        company = user_info['companyName'] if user_info else None
    # 1. Determine User Role and Context
    res = supabase.table('users').select('role, companyName').eq('id', req.userId).execute()
    user_info = res.data[0] if res.data else None
    role = user_info['role'] if user_info else 'user'
    company = user_info['companyName'] if user_info else None

        if role == 'admin' and company:
            # --- ADMIN LOGIC: Team Balance ---
            # Fetch all team members
            cursor.execute("SELECT id, firstName, avg_task_completion_time, completed_tasks_count FROM users WHERE companyName = ?", (company,))
            team_members = [dict(row) for row in cursor.fetchall()]
            
            # Fetch all tasks for the team (tasks owned by any team member)
            member_ids = [m['id'] for m in team_members]
            placeholders = ','.join('?' * len(member_ids))
            cursor.execute(f"SELECT * FROM tasks WHERE ownerId IN ({placeholders}) AND status != 'Done'", tuple(member_ids))
            tasks = [dict(row) for row in cursor.fetchall()]
    if role == 'admin' and company:
        # --- ADMIN LOGIC: Team Balance ---
        # Fetch all team members
        m_res = supabase.table('users').select('id, firstName, avg_task_completion_time, completed_tasks_count').eq('companyName', company).execute()
        team_members = m_res.data
        
        # Fetch all tasks for the team (tasks owned by any team member)
        member_ids = [m['id'] for m in team_members]
        if member_ids:
            t_res = supabase.table('tasks').select('*').in_('ownerId', member_ids).neq('status', 'Done').execute()
            tasks = t_res.data
        else:
            tasks = []

            prompt = f"""
            You are an expert Project Manager AI.
            Goal: Redistribute tasks among team members to balance load and optimize for speed.
            
            Team Stats (Avg Time is in seconds):
            {json.dumps(team_members)}
            
            Tasks:
            {json.dumps([{k: v for k, v in t.items() if k in ['id', 'title', 'priority', 'ownerId', 'plannedDuration']} for t in tasks])}
            
            Instructions:
            1. Assign tasks to members based on their 'avg_task_completion_time' and current load.
            2. Faster members can take more/harder tasks.
            3. Return JSON: {{ "assignments": [ {{ "task_id": "...", "new_owner_id": "..." }} ] }}
            """
            
        else:
            # --- WORKER LOGIC: Persona Balance (Existing) ---
            cursor.execute("SELECT * FROM tasks WHERE ownerId = ?", (req.userId,))
            tasks = [dict(row) for row in cursor.fetchall()]
            
            cursor.execute("SELECT * FROM personas WHERE user_id = ?", (req.userId,))
            personas = [dict(row) for row in cursor.fetchall()]
            
            prompt = f"""
            You are an intelligent task manager. User ID: {req.userId}
            Current Personas: {json.dumps([{k: v for k, v in p.items() if k != 'pk'} for p in personas])}
            Tasks: {json.dumps([{k: v for k, v in t.items() if k != 'pk'} for t in tasks])}
            
            Goal: Organize tasks into personas to balance workload.
            1. Create new personas if needed.
            2. Assign every task to a persona.
            3. Suggest deleting unused personas.
            
            Return JSON:
            {{
                "new_personas": [{{"name": "Name", "weekly_capacity_hours": 40}}],
                "assignments": [{{"task_id": "tid", "persona_name": "Name"}}],
                "delete_persona_ids": ["pid"]
            }}
            """
        prompt = f"""
        You are an expert Project Manager AI.
        Goal: Redistribute tasks among team members to balance load and optimize for speed.
        
        client = genai.Client(api_key=GEMINI_API)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=genai.types.GenerateContentConfig(response_mime_type="application/json")
        )
        result = json.loads(response.text)
        Team Stats (Avg Time is in seconds):
        {json.dumps(team_members)}
        
        # 3. Apply Changes based on Role
        if role == 'admin' and company:
            for assign in result.get("assignments", []):
                cursor.execute("UPDATE tasks SET ownerId = ? WHERE id = ?", (assign.get("new_owner_id"), assign.get("task_id")))
        else:
            # Worker Logic Application
            persona_map = {p['name']: p['id'] for p in personas}
            
            for np in result.get("new_personas", []):
                if np['name'] not in persona_map:
                    new_id = str(uuid.uuid4())
                    cursor.execute("INSERT INTO personas (id, user_id, name, weekly_capacity_hours) VALUES (?, ?, ?, ?)", 
                                   (new_id, req.userId, np['name'], np.get('weekly_capacity_hours', 40)))
                    persona_map[np['name']] = new_id
        Tasks:
        {json.dumps([{k: v for k, v in t.items() if k in ['id', 'title', 'priority', 'ownerId', 'plannedDuration']} for t in tasks])}
        
        Instructions:
        1. Assign tasks to members based on their 'avg_task_completion_time' and current load.
        2. Faster members can take more/harder tasks.
        3. Return JSON: {{ "assignments": [ {{ "task_id": "...", "new_owner_id": "..." }} ] }}
        """
        
    else:
        # --- WORKER LOGIC: Persona Balance (Existing) ---
        t_res = supabase.table('tasks').select('*').eq('ownerId', req.userId).execute()
        tasks = t_res.data
        
        p_res = supabase.table('personas').select('*').eq('user_id', req.userId).execute()
        personas = p_res.data
        
        prompt = f"""
        You are an intelligent task manager. User ID: {req.userId}
        Current Personas: {json.dumps([{k: v for k, v in p.items() if k != 'pk'} for p in personas])}
        Tasks: {json.dumps([{k: v for k, v in t.items() if k != 'pk'} for t in tasks])}
        
        Goal: Organize tasks into personas to balance workload.
        1. Create new personas if needed.
        2. Assign every task to a persona.
        3. Suggest deleting unused personas.
        
        Return JSON:
        {{
            "new_personas": [{{"name": "Name", "weekly_capacity_hours": 40}}],
            "assignments": [{{"task_id": "tid", "persona_name": "Name"}}],
            "delete_persona_ids": ["pid"]
        }}
        """
    
    client = genai.Client(api_key=GEMINI_API)
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=genai.types.GenerateContentConfig(response_mime_type="application/json")
    )
    result = json.loads(response.text)
    
    # 3. Apply Changes based on Role
    if role == 'admin' and company:
        for assign in result.get("assignments", []):
            supabase.table('tasks').update({'ownerId': assign.get("new_owner_id")}).eq('id', assign.get("task_id")).execute()
    else:
        # Worker Logic Application
        persona_map = {p['name']: p['id'] for p in personas}
        
        for np in result.get("new_personas", []):
            if np['name'] not in persona_map:
                new_id = str(uuid.uuid4())
                supabase.table('personas').insert({
                    'id': new_id,
                    'user_id': req.userId,
                    'name': np['name'],
                    'weekly_capacity_hours': np.get('weekly_capacity_hours', 40)
                }).execute()
                persona_map[np['name']] = new_id

            for del_id in result.get("delete_persona_ids", []):
                cursor.execute("DELETE FROM personas WHERE id = ?", (del_id,))
        for del_id in result.get("delete_persona_ids", []):
            supabase.table('personas').delete().eq('id', del_id).execute()

            for assign in result.get("assignments", []):
                if pid := persona_map.get(assign.get("persona_name")):
                    cursor.execute("UPDATE tasks SET personaId = ? WHERE id = ?", (pid, assign.get("task_id")))
        for assign in result.get("assignments", []):
            if pid := persona_map.get(assign.get("persona_name")):
                supabase.table('tasks').update({'personaId': pid}).eq('id', assign.get("task_id")).execute()

        conn.commit()
        return {"status": "success", "changes": result}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
    return {"status": "success", "changes": result}

@app.get('/pulse/{user_id}')
async def get_pulse(user_id: str):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        # Fetch active tasks (not Done)
        cursor.execute("SELECT * FROM tasks WHERE ownerId = ? AND status != 'Done'", (user_id,))
        rows = cursor.fetchall()
        
        tasks = []
        for row in rows:
            t = dict(row)
            try:
                t['dependencyIds'] = json.loads(t['dependencyIds']) if t['dependencyIds'] else []
                t['tags'] = json.loads(t['tags']) if t['tags'] else []
            except:
                t['dependencyIds'] = []
                t['tags'] = []
            if 'pk' in t: del t['pk']
            tasks.append(t)
    # Fetch active tasks (not Done)
    res = supabase.table('tasks').select('*').eq('ownerId', user_id).neq('status', 'Done').execute()
    rows = res.data
    
    tasks = []
    for row in rows:
        t = dict(row)
        try:
            t['dependencyIds'] = json.loads(t['dependencyIds']) if isinstance(t.get('dependencyIds'), str) else (t.get('dependencyIds') or [])
            t['tags'] = json.loads(t['tags']) if isinstance(t.get('tags'), str) else (t.get('tags') or [])
        except:
            t['dependencyIds'] = []
            t['tags'] = []
        if 'pk' in t: del t['pk']
        tasks.append(t)

        # Determine Current Focus (Status = 'In Progress')
        current_task = next((t for t in tasks if t['status'] == 'In Progress'), None)
    # Determine Current Focus (Status = 'In Progress')
    current_task = next((t for t in tasks if t['status'] == 'In Progress'), None)

        # Determine Up Next (Status != 'In Progress', sorted by Priority/Date)
        candidates = [t for t in tasks if t['status'] != 'In Progress']
        prio_map = {"High": 3, "Medium": 2, "Low": 1}
        
        # Sort: Priority DESC, then StartDate ASC
        candidates.sort(key=lambda x: x.get('startDate', 0))
        candidates.sort(key=lambda x: prio_map.get(x.get('priority', 'Low'), 1), reverse=True)
        
        next_task = candidates[0] if candidates else None
        
        rationale = None
        if next_task and GEMINI_API:
            try:
                context = f"Task: {next_task['title']}, Priority: {next_task['priority']}"
                client = genai.Client(api_key=GEMINI_API)
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=f"Explain in one short sentence why '{next_task['title']}' is the best next task given it has high priority. Context: {context}"
                )
                rationale = response.text.strip()
            except Exception as e:
                print(f"Pulse Rationale Error: {e}")
    # Determine Up Next (Status != 'In Progress', sorted by Priority/Date)
    candidates = [t for t in tasks if t['status'] != 'In Progress']
    prio_map = {"High": 3, "Medium": 2, "Low": 1}
    
    # Sort: Priority DESC, then StartDate ASC
    candidates.sort(key=lambda x: x.get('startDate', 0))
    candidates.sort(key=lambda x: prio_map.get(x.get('priority', 'Low'), 1), reverse=True)
    
    next_task = candidates[0] if candidates else None
    
    rationale = None
    if next_task and GEMINI_API:
        try:
            context = f"Task: {next_task['title']}, Priority: {next_task['priority']}"
            client = genai.Client(api_key=GEMINI_API)
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=f"Explain in one short sentence why '{next_task['title']}' is the best next task given it has high priority. Context: {context}"
            )
            rationale = response.text.strip()
        except Exception as e:
            print(f"Pulse Rationale Error: {e}")

        return {
            "currentTask": current_task,
            "nextTask": next_task,
            "rationale": rationale
        }
    finally:
        conn.close()
    return {
        "currentTask": current_task,
        "nextTask": next_task,
        "rationale": rationale
    }

@app.get('/pulse/activity')
async def get_pulse_activity(userId: str):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        # Get user's company to show team activity
        cursor.execute("SELECT companyName FROM users WHERE id = ?", (userId,))
        user_row = cursor.fetchone()
        company = user_row['companyName'] if user_row else None
    # Get user's company to show team activity
    res = supabase.table('users').select('companyName').eq('id', userId).execute()
    company = res.data[0]['companyName'] if res.data else None
    
    if company:
        # Get all users in company
        c_res = supabase.table('users').select('id').eq('companyName', company).execute()
        u_ids = [u['id'] for u in c_res.data]
        a_res = supabase.table('activity_log').select('*').in_('userId', u_ids).order('timestamp', desc=True).limit(50).execute()
    else:
        a_res = supabase.table('activity_log').select('*').eq('userId', userId).order('timestamp', desc=True).limit(50).execute()
         
    rows = a_res.data
    
    # Need user details for logs
    u_ids = list(set(l['userId'] for l in rows))
    u_map = {}
    if u_ids:
        u_res = supabase.table('users').select('id, firstName, lastName, role').in_('id', u_ids).execute()
        u_map = {u['id']: u for u in u_res.data}
    
    events = []
    for t in rows:
        u = u_map.get(t['userId'])
        fname = u['firstName'] if u else ""
        lname = u['lastName'] if u else ""
        role = u['role'] if u else "Member"
        
        if company:
             cursor.execute("""
                SELECT a.*, u.firstName, u.lastName, u.role 
                FROM activity_log a
                JOIN users u ON a.userId = u.id
                WHERE u.companyName = ?
                ORDER BY a.timestamp DESC LIMIT 50
             """, (company,))
        else:
             cursor.execute("""
                SELECT a.*, u.firstName, u.lastName, u.role 
                FROM activity_log a
                JOIN users u ON a.userId = u.id
                WHERE a.userId = ?
                ORDER BY a.timestamp DESC LIMIT 50
             """, (userId,))
             
        rows = cursor.fetchall()
        evt_type = t['type']
        details = t['details']
        
        events = []
        for row in rows:
            t = dict(row)
            evt_type = t['type']
            details = t['details']
            
            timestamp = time_ago(t['timestamp'])
            
            # Fallback for avatar
            avatar = f"https://ui-avatars.com/api/?name={t['firstName']}+{t['lastName']}&background=random"
            
            events.append({
                "id": f"evt_{t['id']}",
                "type": evt_type,
                "actor": {
                    "id": t['ownerId'],
                    "name": f"{t['firstName']} {t['lastName']}",
                    "role": t['role'] or 'Member',
                    "avatar": avatar
                },
                "targetTask": t['targetTask'],
                "targetLink": t['targetLink'] if t['targetLink'] else "#",
                "details": details,
                "timestamp": timestamp,
                "actionRequired": False
            })
            
        # Append System Message at the end (oldest)
        timestamp = time_ago(t['timestamp'])
        
        # Fallback for avatar
        avatar = f"https://ui-avatars.com/api/?name={fname}+{lname}&background=random"
        
        events.append({
            "id": 'se1', "type": 'status_change',
            "actor": { "id": 'sys', "name": 'System', "role": 'Bot', "avatar": 'https://ui-avatars.com/api/?name=System&background=000&color=fff', "status": 'online', "workload": 0 },
            "targetTask": 'Welcome to TaskLinex', "targetLink": '#',
            "details": 'Your TaskLinex account has been created.', "timestamp": 'Joined'
            "id": f"evt_{t['id']}",
            "type": evt_type,
            "actor": {
                "id": t['userId'],
                "name": f"{fname} {lname}",
                "role": role or 'Member',
                "avatar": avatar
            },
            "targetTask": t['targetTask'],
            "targetLink": t['targetLink'] if t['targetLink'] else "#",
            "details": details,
            "timestamp": timestamp,
            "actionRequired": False
        })
            
        return events
    finally:
        conn.close()
        
    # Append System Message at the end (oldest)
    events.append({
        "id": 'se1', "type": 'status_change',
        "actor": { "id": 'sys', "name": 'System', "role": 'Bot', "avatar": 'https://ui-avatars.com/api/?name=System&background=000&color=fff', "status": 'online', "workload": 0 },
        "targetTask": 'Welcome to TaskLinex', "targetLink": '#',
        "details": 'Your TaskLinex account has been created.', "timestamp": 'Joined'
    })
        
    return events

@app.get('/pulse/stats')
async def get_pulse_stats(userId: str):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        # Calculate Velocity (Avg completion time of user)
        cursor.execute("SELECT avg_task_completion_time, isNew FROM users WHERE id = ?", (userId,))
        user = cursor.fetchone()
        avg_time = user['avg_task_completion_time'] if user else 0
        is_new_user = bool(user['isNew']) if user and user['isNew'] is not None else True
    # Calculate Velocity (Avg completion time of user)
    res = supabase.table('users').select('avg_task_completion_time, isNew').eq('id', userId).execute()
    user = res.data[0] if res.data else None
    avg_time = user['avg_task_completion_time'] if user else 0
    is_new_user = bool(user['isNew']) if user and user['isNew'] is not None else True

        velocity = "Medium"
        if avg_time > 0 and avg_time < 3600: velocity = "High" # Less than hour avg
        elif avg_time > 14400: velocity = "Low" # More than 4 hours avg
    velocity = "Medium"
    if avg_time > 0 and avg_time < 3600: velocity = "High" # Less than hour avg
    elif avg_time > 14400: velocity = "Low" # More than 4 hours avg

        # Count Blockers (Tasks with dependencies that are not Done)
        # Simplified: Just counting High priority tasks not done
        cursor.execute("SELECT COUNT(*) as count FROM tasks WHERE priority = 'High' AND status != 'Done'")
        blocker_count = cursor.fetchone()['count']
    # Count Blockers (Tasks with dependencies that are not Done)
    # Simplified: Just counting High priority tasks not done
    b_res = supabase.table('tasks').select('id', count='exact').eq('priority', 'High').neq('status', 'Done').execute()
    blocker_count = b_res.count

        # Sprint Progress (Mocking a sprint as all tasks in DB)
        cursor.execute("SELECT COUNT(*) as count FROM tasks WHERE status = 'Done'")
        completed = cursor.fetchone()['count']
        
        cursor.execute("SELECT COUNT(*) as count FROM tasks WHERE status != 'Done'")
        remaining = cursor.fetchone()['count']
    # Sprint Progress (Mocking a sprint as all tasks in DB)
    c_res = supabase.table('tasks').select('id', count='exact').eq('status', 'Done').execute()
    completed = c_res.count
    
    r_res = supabase.table('tasks').select('id', count='exact').neq('status', 'Done').execute()
    remaining = r_res.count

        return {
            "velocity": velocity,
            "blockers": { "count": blocker_count, "type": "blocker" },
            "sprint": { "daysLeft": 5, "completed": completed, "remaining": remaining },
            "isNewUser": is_new_user
        }
    finally:
        conn.close()
    return {
        "velocity": velocity,
        "blockers": { "count": blocker_count, "type": "blocker" },
        "sprint": { "daysLeft": 5, "completed": completed, "remaining": remaining },
        "isNewUser": is_new_user
    }

@app.get('/analytics/{user_id}')
async def get_analytics(user_id: str):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        # Fetch all tasks to resolve dependencies globally
        cursor.execute("SELECT * FROM tasks")
        all_rows = cursor.fetchall()
    # Fetch all tasks to resolve dependencies globally
    res = supabase.table('tasks').select('*').execute()
    all_rows = res.data
    
    all_tasks_map = {}
    user_tasks = []
    
    for row in all_rows:
        t = dict(row)
        try:
            t['dependencyIds'] = json.loads(t['dependencyIds']) if isinstance(t.get('dependencyIds'), str) else (t.get('dependencyIds') or [])
        except:
            t['dependencyIds'] = []
        
        all_tasks_map = {}
        user_tasks = []
        all_tasks_map[t['id']] = t
        if t['ownerId'] == user_id:
            user_tasks.append(t)

    # 1. Blocked Flow: Tasks not done but blocked by incomplete dependencies
    blocked_count = 0
    for t in user_tasks:
        if t['status'] == 'Done': continue
        
        for row in all_rows:
            t = dict(row)
            try:
                t['dependencyIds'] = json.loads(t['dependencyIds']) if t['dependencyIds'] else []
            except:
                t['dependencyIds'] = []
            
            all_tasks_map[t['id']] = t
            if t['ownerId'] == user_id:
                user_tasks.append(t)
        is_blocked = False
        for dep_id in t['dependencyIds']:
            dep = all_tasks_map.get(dep_id)
            if dep and dep['status'] != 'Done':
                is_blocked = True
                break
        if is_blocked:
            blocked_count += 1

        # 1. Blocked Flow: Tasks not done but blocked by incomplete dependencies
        blocked_count = 0
        for t in user_tasks:
            if t['status'] == 'Done': continue
            
            is_blocked = False
            for dep_id in t['dependencyIds']:
                dep = all_tasks_map.get(dep_id)
                if dep and dep['status'] != 'Done':
                    is_blocked = True
                    break
            if is_blocked:
                blocked_count += 1
    # 2. Stalled/Idle Metric: In Progress tasks untouched for > 3 days
    stalled_count = 0
    now = datetime.now().timestamp()
    STALL_THRESHOLD = 3 * 24 * 3600 # 3 days in seconds
    
    for t in user_tasks:
        if t['status'] == 'In Progress':
            # Use startDate as proxy for last activity if no updatedAt
            start_time = t['startDate'] if t['startDate'] else now
            if (now - start_time) > STALL_THRESHOLD:
                stalled_count += 1

        # 2. Stalled/Idle Metric: In Progress tasks untouched for > 3 days
        stalled_count = 0
        now = datetime.now().timestamp()
        STALL_THRESHOLD = 3 * 24 * 3600 # 3 days in seconds
    # 3. Velocity Trend: Avg completion time (hours) per week
    velocity_map = {}
    completed_tasks = [t for t in user_tasks if t['status'] == 'Done' and t.get('completedAt')]
    completed_tasks.sort(key=lambda x: x['completedAt']) # Sort chronologically
    
    for t in completed_tasks:
        comp_time = t['completedAt']
        start_time = t['startDate'] if t['startDate'] else comp_time
        duration_hours = max(0, (comp_time - start_time) / 3600.0)
        
        for t in user_tasks:
            if t['status'] == 'In Progress':
                # Use startDate as proxy for last activity if no updatedAt
                start_time = t['startDate'] if t['startDate'] else now
                if (now - start_time) > STALL_THRESHOLD:
                    stalled_count += 1
        dt = datetime.fromtimestamp(comp_time)
        week_label = dt.strftime("%b %d") # e.g. "Oct 24"
        
        if week_label not in velocity_map: velocity_map[week_label] = []
        velocity_map[week_label].append(duration_hours)
        
    velocity_trend = [{"name": k, "value": round(sum(v)/len(v), 1)} for k, v in velocity_map.items()]
    velocity_trend = velocity_trend[-7:] # Last 7 data points

        # 3. Velocity Trend: Avg completion time (hours) per week
        velocity_map = {}
        completed_tasks = [t for t in user_tasks if t['status'] == 'Done' and t.get('completedAt')]
        completed_tasks.sort(key=lambda x: x['completedAt']) # Sort chronologically
    # 4. Capacity Heatmap: Projected load (hours) for next 14 days
    day_map = {}
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    for i in range(14):
        day_map[(today + timedelta(days=i)).strftime("%Y-%m-%d")] = 0
        
        for t in completed_tasks:
            comp_time = t['completedAt']
            start_time = t['startDate'] if t['startDate'] else comp_time
            duration_hours = max(0, (comp_time - start_time) / 3600.0)
            
            dt = datetime.fromtimestamp(comp_time)
            week_label = dt.strftime("%b %d") # e.g. "Oct 24"
            
            if week_label not in velocity_map: velocity_map[week_label] = []
            velocity_map[week_label].append(duration_hours)
            
        velocity_trend = [{"name": k, "value": round(sum(v)/len(v), 1)} for k, v in velocity_map.items()]
        velocity_trend = velocity_trend[-7:] # Last 7 data points
    for t in user_tasks:
        if t['status'] == 'Done': continue
        planned_hours = (t['plannedDuration'] or 3600) / 3600.0
        # Distribute load: assume max 4h/day per task
        days_needed = max(1, int(planned_hours / 4))
        load_per_day = planned_hours / days_needed
        
        for i in range(days_needed):
            d_str = (today + timedelta(days=i)).strftime("%Y-%m-%d")
            if d_str in day_map: day_map[d_str] += load_per_day

        # 4. Capacity Heatmap: Projected load (hours) for next 14 days
        day_map = {}
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        for i in range(14):
            day_map[(today + timedelta(days=i)).strftime("%Y-%m-%d")] = 0
            
        for t in user_tasks:
            if t['status'] == 'Done': continue
            planned_hours = (t['plannedDuration'] or 3600) / 3600.0
            # Distribute load: assume max 4h/day per task
            days_needed = max(1, int(planned_hours / 4))
            load_per_day = planned_hours / days_needed
            
            for i in range(days_needed):
                d_str = (today + timedelta(days=i)).strftime("%Y-%m-%d")
                if d_str in day_map: day_map[d_str] += load_per_day
    heatmap_data = [{"date": k, "count": round(v, 1)} for k, v in day_map.items()]

        heatmap_data = [{"date": k, "count": round(v, 1)} for k, v in day_map.items()]
    return {
        "blockedFlow": blocked_count,
        "stalledCount": stalled_count,
        "velocityTrend": velocity_trend,
        "capacityHeatmap": heatmap_data
    }

        return {
            "blockedFlow": blocked_count,
            "stalledCount": stalled_count,
            "velocityTrend": velocity_trend,
            "capacityHeatmap": heatmap_data
        }
    except Exception as e:
        print(f"Analytics Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.post('/pulse/set_focus')
async def set_focus(req: SetFocusRequest):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        # Fetch task title
        cursor.execute("SELECT title FROM tasks WHERE id = ?", (req.taskId,))
        row = cursor.fetchone()
        task_title = row[0] if row else "Task"
    res = supabase.table('tasks').select('title').eq('id', req.taskId).execute()
    task_title = res.data[0]['title'] if res.data else "Task"

        # 1. Pause other tasks
        cursor.execute("UPDATE tasks SET status = 'Todo' WHERE ownerId = ? AND status = 'In Progress'", (req.userId,))
        # 2. Set new focus
        cursor.execute("UPDATE tasks SET status = 'In Progress' WHERE id = ?", (req.taskId,))
        
        log_event(cursor, req.userId, 'status_change', task_title, 'started working on')
        conn.commit()
        return {"message": "Focus updated"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
    # 1. Pause other tasks
    supabase.table('tasks').update({'status': 'Todo'}).eq('ownerId', req.userId).eq('status', 'In Progress').execute()
    # 2. Set new focus
    supabase.table('tasks').update({'status': 'In Progress'}).eq('id', req.taskId).execute()
    
    log_event(req.userId, 'status_change', task_title, 'started working on')
    return {"message": "Focus updated"}

if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=SERVER_PORT, reload=True)
