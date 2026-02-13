from fastapi import FastAPI, HTTPException, status, Response, Request, Body, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, timezone
import json, os, jwt, uuid, uvicorn, dotenv, socket
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
from dotenv import load_dotenv
import jwt
# # --- Setup & Config ---
# backend_dir = Path(__file__).resolve().parent
# root_dir = backend_dir.parent
# dotenv_path = root_dir / ".env.local"

# if dotenv_path.exists():
#     dotenv.load_dotenv(dotenv_path=dotenv_path)
#     print(f"Loaded .env from: {dotenv_path}")
# else:
#     print(f"Warning: .env not found at {dotenv_path}. Using default settings.")

# load_dotenv(dotenv_path=".env.local")

base_dir = Path(__file__).resolve().parent.parent
dotenv_path = base_dir / ".env.local"



if dotenv_path.exists():
    load_dotenv(dotenv_path=dotenv_path)
    print(f"✅ Success: .env.local loaded from {dotenv_path}")
    print(f"DEBUG: Key starts with: {str(os.getenv('SUPABASE_SERVICE_ROLE_KEY'))[:12]}")

else:
    print(f"❌ Error: .env.local not found at {dotenv_path}")
    print(f"Current Working Directory: {os.getcwd()}")



# Supabase Init
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
JWKS_URL = os.getenv("SUPABASE_JWKS")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_KEY")
if not SUPABASE_URL or not SUPABASE_KEY or not SUPABASE_JWT_SECRET:
    raise ValueError("Supabase URL, KEY, or JWT_SECRET missing in environment!")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: Supabase credentials missing!")
else:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print(f"DEBUG: Key loaded! Starts with: {SUPABASE_KEY[:10]}...")
    print("✅ Supabase client initialized with Secret Key")

# Server initialization
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Supabase handles its own connection pooling and schema management
    yield

ASUS_LOCAL_URL = "http://127.0.0.1:8001/predict"
MINI_ONLINE_URL = "https://tasklinex-mini-ai.hf.space/predict"
AI_TIMEOUT = 5.0

app = FastAPI(lifespan=lifespan)

# --- Constants ---
GEMINI_API = os.getenv('GEMINI_API_KEY')
VERCEL_DOMAIN = "https://your-vercel-domain.vercel.app" # CHANGE THIS
MODEL_ORDER = os.getenv("ENVOY_MODEL_ORDER", "asus,gemini,mini").split(",")
SERVER_PORT = int(os.getenv("BACKEND_PORT", 8000))

# --- Auth ---
auth_scheme = HTTPBearer()

from jwt.exceptions import InvalidTokenError, ExpiredSignatureError, InvalidSignatureError
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
import base64

auth_scheme = HTTPBearer()

# Your JWK from Supabase
JWK_DATA = {
    "kty": "EC",
    "crv": "P-256",
    "x": "5DLsWjnNvuPMnvs8g5xcBZpiYsGMVu0jsFv49XfxwiQ",
    "y": "bW5dA4pg1CgSYCCPYF7nxSwImO_kDya4KE8HTBiSIjk",
    "alg": "ES256",
    "use": "sig"
}

def jwk_to_pem(jwk: dict) -> bytes:
    """Convert ES256 JWK to PEM public key"""
    # Decode base64url coordinates (add padding if needed)
    x_bytes = base64.urlsafe_b64decode(jwk['x'] + '==')
    y_bytes = base64.urlsafe_b64decode(jwk['y'] + '==')
    
    # Create ECC public key
    curve = ec.SECP256R1()  # P-256 curve
    public_numbers = ec.EllipticCurvePublicNumbers(
        x=int.from_bytes(x_bytes, 'big'),
        y=int.from_bytes(y_bytes, 'big'),
        curve=curve
    )
    
    public_key = public_numbers.public_key()
    
    # Convert to PEM format
    pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    
    return pem

# Convert JWK to PEM at startup
try:
    PUBLIC_KEY_PEM = jwk_to_pem(JWK_DATA)
    print("✅ Supabase ES256 public key loaded")
except Exception as e:
    print(f"❌ Failed to load public key: {e}")
    PUBLIC_KEY_PEM = None

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(auth_scheme)):
    """
    SECURE JWT verification with ES256 public key
    """
    if not PUBLIC_KEY_PEM:
        raise HTTPException(
            status_code=500,
            detail="Server misconfiguration: JWT verification unavailable"
        )
    
    token = credentials.credentials
    
    try:
        # Decode and VERIFY with ES256
        payload = jwt.decode(
            token,
            PUBLIC_KEY_PEM,
            algorithms=["ES256"],
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_aud": False,
                "require": ["exp", "sub"]
            }
        )
        
        if not payload.get('sub'):
            raise HTTPException(
                status_code=401,
                detail="Invalid token: missing user ID"
            )
        
        return payload
    
    except ExpiredSignatureError:
        print("🔒 Token expired")
        raise HTTPException(
            status_code=401,
            detail="Token expired. Please log in again."
        )
    
    except InvalidSignatureError:
        print("🚨 SECURITY: Invalid signature!")
        raise HTTPException(
            status_code=401,
            detail="Invalid token signature"
        )
    
    except jwt.exceptions.DecodeError as e:
        print(f"⚠️ Malformed token: {e}")
        raise HTTPException(
            status_code=401,
            detail="Malformed token"
        )
    
    except Exception as e:
        print(f"❌ Auth error: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=401,
            detail="Authentication failed"
        )


# Logic Constants
# Expanded to include statuses used by the dependency logic
VALID_STATUS = {"Todo", "In Progress", "Done", "Blocked", "At Risk", "On Track"}
VALID_PRIORITY = {"Low", "Medium", "High"}
IMMUTABLE_FIELDS = {"pk", "id", "projectId", "ownerId", "personaId", "progress", "createdAt"}
AI_MUTABLE_FIELDS = {"status", "priority"}
AI_OPTIONAL_FIELDS = {"startDate", "duration", "plannedDuration", "dependencyIds", "tags"}

# --- Helpers ---

def safe_json_loads(text: str):
    """
    Robust JSON parser that handles Markdown code blocks, triple backticks,
    and common LLM formatting issues to prevent crashes.
    """
    cleaned = text.strip()
    # Strip markdown code blocks if present
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        # Remove first line (```json or ```)
        if len(lines) > 0 and lines[0].startswith("```"):
            lines = lines[1:]
        # Remove last line if it is just backticks
        if len(lines) > 0 and lines[-1].strip() == "```":
            lines = lines[:-1]
        cleaned = "\n".join(lines).strip()

    try:
        return json.loads(cleaned)
    except Exception:
        # Fallback: attempt to find the first outer bracket pair
        start_list = cleaned.find("[")
        end_list = cleaned.rfind("]")
        start_obj = cleaned.find("{")
        end_obj = cleaned.rfind("}")

        # Pick the wider valid range if both exist, or the one that exists
        candidates = []
        if start_list != -1 and end_list != -1:
            candidates.append((start_list, end_list, True)) # True for list
        if start_obj != -1 and end_obj != -1:
            candidates.append((start_obj, end_obj, False)) # False for obj

        if not candidates:
            return None

        # Sort by length descending to try the largest structure first
        candidates.sort(key=lambda x: x[1] - x[0], reverse=True)

        for s, e, _ in candidates:
            try:
                return json.loads(cleaned[s:e+1])
            except:
                continue
        return None

RATE_LIMIT = {}
WINDOW = 60
MAX_CALLS = 8  # per user per minute

def is_rate_limited(user_id: str) -> bool:
    """Returns True if the user has exceeded their limit, False otherwise."""
    now = time()
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
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API}"
        payload = {
            "contents": [{"parts": [{"text": prompt_text}]}]
        }
        async with httpx.AsyncClient(timeout=AI_TIMEOUT) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            # Extract text from Gemini response structure
            if "candidates" in data and data["candidates"]:
                return data["candidates"][0]["content"]["parts"][0]["text"]
            return None
    except Exception as e:
        print("Gemini failed:", e)
        return None

async def generate_envoy_proposals(tasks_list, context_text: str):
    prompt_text = f"""
        You are 'Envoy', an intelligent project management assistant.
        Analyze the following tasks and user context to suggest improvements.

        USER CONTEXT: {json.dumps(context_text or 'No specific context provided.')}

        TASKS DATA: {json.dumps(tasks_list)}

        INSTRUCTIONS:
        1. Identify friction points (stalled tasks, priority mismatches, missing dependencies).
        2. Propose concrete changes (e.g., change status, upgrade priority).
        3. Return strictly a JSON list of objects. No prose.

        FORMAT:
        [
            {{
                "task_id": "UUID",
                "field": "status" | "priority",
                "suggested": "New Value",
                "reason": "Short explanation of why."
            }}
        ]
    """
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
            if parsed and isinstance(parsed, list):
                return parsed

    raise HTTPException(status_code=503, detail="All AI engines failed or returned invalid format")

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
    f"http://{local_ip}:3000",
    "http://192.168.0.113:3000",
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

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print(f"Validation Error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
    )

# --- Logic Helpers ---
def evaluate_task_status(task_id: str):
    """Handles dependency-based status updates (Blocked/At Risk/On Track)."""
    # 1. Fetch current status from Supabase
    res_task = supabase.table('tasks').select('status').eq('id', task_id).execute()
    if not res_task.data:
        return
    current_status = res_task.data[0]['status']
    if current_status == 'Done': return

    # 2. Check for blockers (from_task is NOT Done)
    res_blocked = supabase.table('dependencies').select('from_task_id').eq('to_task_id', task_id).eq('type', 'blocked_by').execute()
    blocked_ids = [d['from_task_id'] for d in res_blocked.data]

    is_blocked = False
    if blocked_ids:
        # Check if any blocker is NOT 'Done'
        res_check = supabase.table('tasks').select('id').in_('id', blocked_ids).neq('status', 'Done').execute()
        is_blocked = len(res_check.data) > 0

    # 3. Check for waiting status
    res_waiting = supabase.table('dependencies').select('id').eq('to_task_id', task_id).eq('type', 'waiting_on').execute()
    is_waiting = len(res_waiting.data) > 0

    # 4. Determine new status
    new_status = current_status
    if is_blocked:
        new_status = 'Blocked'
    elif is_waiting:
        new_status = 'At Risk'
    elif current_status in ['Blocked', 'At Risk']:
        new_status = 'On Track'

    # 5. Apply change only if status actually moved
    if new_status != current_status:
        supabase.table('tasks').update({'status': new_status}).eq('id', task_id).execute()
        log_event(None, 'auto_status', task_id, f"status auto-updated to {new_status}")


def log_event(userId, type, targetTask, details):
    """Logs system and user events to Supabase activity_log."""
    safe_uid = userId if userId else "system"
    event_id = str(uuid.uuid4())
    timestamp = int(datetime.now(timezone.utc).timestamp())

    supabase.table('activity_log').insert({
        "id": event_id,
        "userId": safe_uid,
        "type": type,
        "targetTask": targetTask,
        "details": details,
        "timestamp": timestamp
    }).execute()


def time_ago(timestamp):
    now = datetime.now(timezone.utc).timestamp()
    diff = now - timestamp
    if diff < 60: return "Just now"
    elif diff < 3600: return f"{int(diff/60)}m ago"
    elif diff < 86400: return f"{int(diff/3600)}h ago"
    else: return f"{int(diff/86400)}d ago"


# --- Models ---
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

class UsernameLoginRequest(BaseModel):
    username: str
    password: str

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
    task_id: Optional[str] = None
    suggestion_type: str
    confidence: float = Field(ge=0, le=1)
    message: str


class EnvoySuggestRequest(BaseModel):
    task_id: Optional[str] = None  # Made optional - can be null for global suggestions
    context_text: str
    all: bool = False

class EnsureUserRequest(BaseModel):
    userId: str
    email: Optional[str] = None
    username: str
    firstName: Optional[str] = ""
    lastName: Optional[str] = ""
    companyName: Optional[str] = None
    role: Optional[str] = "user"
    timezone: Optional[str] = "UTC"


class UserProfileUpdate(BaseModel):
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    timezone: Optional[str] = None
    companyName: Optional[str] = None

class Proposal(BaseModel):
    field:str
    suggested:str
    reason:Optional[str]=None


class PersonaDefinition(BaseModel):
    id: Optional[str] = None
    name: str
    role: str
    color: str
    description: str = ""  # NEW: AI uses this to understand persona goals
    capacity_limit: int = 40
    allow_overload: bool = False

class TaskWithPersona(BaseModel):
    id: str
    title: str
    persona_id: Optional[str] = None
    status: str
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    dependencies: List[str] = []
    working_on: bool = False  # NEW: Track if task is being worked on

class EnvoyRequest(BaseModel):
    task_id: Optional[str] = None 
    all: bool = False
    context_text: Optional[str] = None
    proposals: Optional[List['Proposal']] = None


class ActivityLog(BaseModel):
    id: Optional[str] = None
    user_id: str
    action: str
    entity_type: str
    entity_id: str
    metadata: dict = {}
    created_at: Optional[str] = None
    persona_id: Optional[str] = None  # NEW: Track which persona made the change


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

class DeleteAccountRequest(BaseModel):
    userId: str

class PasswordChangeRequest(BaseModel):
    currentPassword: str
    newPassword: str


# --- Endpoints ---

@app.get('/')
async def root():
    return {"status":'ok',"message": "TaskLinex API is active"}

@app.get('/users/{user_id}')
async def get_user_info(user_id: str, user: dict = Depends(get_current_user)):
    """
    Get user info with retry logic to handle race condition with Supabase trigger.
    When a new user registers, the trigger creates the user record asynchronously.
    This can cause a 404 if the frontend fetches the user too quickly.
    """
    max_retries = 5
    retry_delay = 0.5  # seconds
    
    for attempt in range(max_retries):
        res = supabase.table('users').select('id, firstName, lastName, username, email, role, companyName, timezone').eq('id', user_id).execute()
        
        if res.data:
            return res.data[0]
        
        # If not found and we have retries left, wait and try again
        if attempt < max_retries - 1:
            print(f"User {user_id} not found, retry {attempt + 1}/{max_retries}")
            await asyncio.sleep(retry_delay)
            retry_delay *= 1.5  # Exponential backoff: 0.5s, 0.75s, 1.125s, 1.6875s
    
    # After all retries exhausted, return 404
    raise HTTPException(status_code=404, detail="User not found after retries")




@app.post('/auth/login-username')
async def login_with_username(req: UsernameLoginRequest):
    """
    Login with username instead of email
    """
    # Find user by username
    user_res = supabase.table('users').select('id, email').eq('username', req.username).execute()
    
    if not user_res.data:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    user = user_res.data[0]
    email = user['email']
    
    # Return email so frontend can use it for Supabase auth
    return {
        "email": email,
        "userId": user['id']
    }




@app.post('/users/ensure')
async def ensure_user_exists(req: EnsureUserRequest, user: dict = Depends(get_current_user)):
    """
    Fallback endpoint: If Supabase trigger fails, this creates the user manually.
    """
    # Check if user exists
    res = supabase.table('users').select('*').eq('id', req.userId).execute()
    
    if res.data:
        return {"status": "exists", "updated": False}
    
    # Generate email if not provided
    if not req.email or req.email.strip() == "":
        email = f"{req.username}@tasklinex.local"
    else:
        email = req.email
    
    try:
        supabase.table('users').insert({
            'id': req.userId,
            'email': email,
            'username': req.username,
            'firstName': req.firstName or '',
            'lastName': req.lastName or '',
            'companyName': req.companyName or '',
            'role': req.role or 'user',
            'isNew': True,
            'timezone': req.timezone or 'UTC'
        }).execute()
        
    except Exception as e:
        if "duplicate" in str(e).lower() or "unique" in str(e).lower():
            res = supabase.table('users').select('*').eq('id', req.userId).execute()
            if res.data:
                return {"status": "exists", "updated": False}
        print(f"Error creating user: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    # Create default persona
    persona_id = str(uuid.uuid4())
    persona_name = f"{req.firstName} (Default)" if req.firstName else "Default Persona"
    
    supabase.table('personas').insert({
        'id': persona_id,
        'user_id': req.userId,
        'name': persona_name,
        'weekly_capacity_hours': 40,
        'role': 'Member'
    }).execute()
    
    # Create welcome task
    task_id = str(uuid.uuid4())
    now = int(datetime.now().timestamp())
    
    supabase.table('tasks').insert({
        'id': task_id,
        'projectId': 'proj1',
        'title': '🎉 Welcome to TaskLinex!',
        'status': 'Todo',
        'priority': 'Medium',
        'ownerId': req.userId,
        'startDate': now,
        'duration': 3600,
        'plannedDuration': 3600,
        'personaId': persona_id
    }).execute()
    
    print(f"✅ Manually created user {req.userId}")
    return {"status": "created"}



@app.put('/users/{user_id}/profile')
async def update_user_profile(
    user_id: str, 
    updates: UserProfileUpdate, 
    user: dict = Depends(get_current_user)
):
    """
    Update user profile information
    """
    if user_id != user.get('sub'):
        raise HTTPException(status_code=403, detail="Cannot update other users")
    
    update_data = {}
    
    if updates.firstName is not None:
        update_data['firstName'] = updates.firstName
    
    if updates.lastName is not None:
        update_data['lastName'] = updates.lastName
    
    if updates.username is not None:
        existing = supabase.table('users').select('id').eq('username', updates.username).execute()
        if existing.data and existing.data[0]['id'] != user_id:
            raise HTTPException(status_code=400, detail="Username already taken")
        update_data['username'] = updates.username
    
    if updates.email is not None:
        update_data['email'] = updates.email
    
    if updates.timezone is not None:
        update_data['timezone'] = updates.timezone
    
    if updates.companyName is not None:
        update_data['companyName'] = updates.companyName
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    result = supabase.table('users').update(update_data).eq('id', user_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    return result.data[0]

@app.post('/updateAccount')
async def update_account(req: UpdateAccountRequest, user: dict = Depends(get_current_user)):
    # 1. Verify user exists
    res_user = supabase.table('users').select('id').eq('id', req.userId).execute()
    if not res_user.data:
        raise HTTPException(status_code=404, detail="User not found")

    if req.userId != user['sub']:
        raise HTTPException(status_code=403, detail="Forbidden")

    # 2. Check uniqueness for username/email only if they are being changed
    if req.username:
        check = supabase.table('users').select('id').eq('username', req.username).neq('id', req.userId).execute()
        if check.data:
            raise HTTPException(status_code=409, detail="Username already taken")

    if req.email:
        check = supabase.table('users').select('id').eq('email', req.email).neq('id', req.userId).execute()
        if check.data:
            raise HTTPException(status_code=409, detail="Email already taken")

    # 3. Build update dictionary
    updates = {}
    if req.displayName:
        parts = req.displayName.strip().split(' ', 1)
        updates['firstName'] = parts[0]
        updates['lastName'] = parts[1] if len(parts) > 1 else ""

    if req.username: updates['username'] = req.username
    if req.email: updates['email'] = req.email
    if req.timezone: updates['timezone'] = req.timezone

    if updates:
        supabase.table('users').update(updates).eq('id', req.userId).execute()

    return {"message": "Account updated successfully"}

@app.post('/deleteAccount')
async def delete_account(req: DeleteAccountRequest, user: dict = Depends(get_current_user)):
    if req.userId != user['sub']:
        raise HTTPException(status_code=403, detail="Forbidden")

    # Delete related data.
    # Get tasks to delete dependecies
    res_tasks = supabase.table('tasks').select('id').eq('ownerId', req.userId).execute()
    task_ids = [t['id'] for t in res_tasks.data]

    if task_ids:
        supabase.table('dependencies').delete().in_('from_task_id', task_ids).execute()
        supabase.table('dependencies').delete().in_('to_task_id', task_ids).execute()
        supabase.table('task_persona_assignments').delete().in_('task_id', task_ids).execute()
        supabase.table('tasks').delete().eq('ownerId', req.userId).execute()

    supabase.table('personas').delete().eq('user_id', req.userId).execute()
    supabase.table('activity_log').delete().eq('userId', req.userId).execute()
    supabase.table('interventions').delete().eq('user_id', req.userId).execute()

    supabase.table('users').delete().eq('id', req.userId).execute()

    return {"message": "Account deleted successfully"}

# @app.get('/settings/{user_id}')
# async def get_user_settings(user_id: str, user: dict = Depends(get_current_user)):
#     res_user = supabase.table('users').select('*').eq('id', user_id).execute()
#     if not res_user.data:
#         raise HTTPException(status_code=404, detail="User not found")
#     user = res_user.data[0]

#     # Handle settings JSON
#     raw_settings = user.get('settings')
#     if isinstance(raw_settings, str):
#         saved_settings = json.loads(raw_settings)
#     else:
#         saved_settings = raw_settings if raw_settings else {}

#     res_personas = supabase.table('personas').select('*').eq('user_id', user_id).execute()
#     active_personas = []
#     for row in res_personas.data:
#         active_personas.append({
#             "id": row['id'],
#             "name": row['name'],
#             "role": row.get('role', 'Member'),
#             "color": row.get('color', '#6366f1'),
#             "capacityLimit": row['weekly_capacity_hours'],
#             "allowOverload": bool(row.get('allow_overload', False))
#         })

#     response = {
#         "account": {
#             "displayName": f"{user.get('firstName') or ''} {user.get('lastName') or ''}".strip(),
#             "email": user['email'],
#             "avatarUrl": f"https://ui-avatars.com/api/?name={user.get('firstName')}+{user.get('lastName')}&background=random",
#             "accountType": user.get('role') if user.get('role') else 'Individual',
#             "language": "en-US",
#             "twoFactorEnabled": False
#         },
#         "personas": {
#             "enableVirtualTeammates": saved_settings.get('personas', {}).get('enableVirtualTeammates', True),
#             "activePersonas": active_personas
#         },
#         "envoy": saved_settings.get('envoy', {
#             "suggestionsEnabled": True,
#             "autoDetectDependencies": True,
#             "communicationStyle": 'Concise',
#             "sensitivityLevel": 7,
#             "permissions": { "canDraftNotes": True, "canProposeHandoffs": True, "canModifyDates": False }
#         }),
#         "visuals": saved_settings.get('visuals', {
#             "defaultTimelineScale": 'Week',
#             "showGhostBars": True,
#             "showDependencyLines": True,
#             "uiDensity": 'Comfortable'
#         }),
#         "experimental": saved_settings.get('experimental', {
#             "enableJQL": False,
#             "usegpuAcceleration": True
#         })
#     }
#     return response

@app.post('/settings/{user_id}/{section}')
async def update_user_settings_section(user_id: str, section: str, payload: dict = Body(...), user: dict = Depends(get_current_user)):
    res_user = supabase.table('users').select('settings').eq('id', user_id).execute()
    if not res_user.data:
        raise HTTPException(status_code=404, detail="User not found")

    raw_settings = res_user.data[0].get('settings')
    current_settings = json.loads(raw_settings) if isinstance(raw_settings, str) else (raw_settings or {})

    if section == 'personas':
        if 'personas' not in current_settings: current_settings['personas'] = {}
        current_settings['personas']['enableVirtualTeammates'] = payload.get('enableVirtualTeammates', True)

        # Sync Personas
        incoming_personas = payload.get('activePersonas', [])
        incoming_ids = [p['id'] for p in incoming_personas if 'id' in p]

        # Delete removed
        if incoming_ids:
            supabase.table('personas').delete().eq('user_id', user_id).not_.in_('id', incoming_ids).execute()
        else:
            supabase.table('personas').delete().eq('user_id', user_id).execute()

        # Upsert incoming
        for p in incoming_personas:
            p_data = {
                'id': p.get('id') or str(uuid.uuid4()),
                'user_id': user_id,
                'name': p['name'],
                'role': p.get('role', 'Member'),
                'color': p.get('color', '#6366f1'),
                'weekly_capacity_hours': p.get('capacityLimit', 40),
                'allow_overload': p.get('allowOverload', False)
            }
            supabase.table('personas').upsert(p_data).execute()

    elif section in ['envoy', 'visuals', 'experimental']:
        current_settings[section] = payload

    supabase.table('users').update({'settings': json.dumps(current_settings)}).eq('id', user_id).execute()
    return {"status": "success"}

@app.get('/projects')
async def get_projects(user: dict = Depends(get_current_user)):
    res = supabase.table('projects').select('*').execute()
    projects = []
    for row in res.data:
        p = dict(row)
        if 'pk' in p: del p['pk']
        p['visible'] = bool(p.get('visible', True))
        projects.append(p)
    return projects

@app.post('/createProject')
async def create_project(project: ProjectCreate, user: dict = Depends(get_current_user)):
    project_id = str(uuid.uuid4())
    supabase.table('projects').insert({'id': project_id, 'name': project.name}).execute()
    if project.userId:
        log_event(project.userId, 'status_change', project.name, 'created project')
    return {"id": project_id, "name": project.name, "visible": True}

@app.post('/deleteProject')
async def delete_project(project: ProjectDelete, user: dict = Depends(get_current_user)):
    supabase.table('tasks').delete().eq('projectId', project.id).execute()

    # Get name for logging
    res = supabase.table('projects').select('name').eq('id', project.id).execute()
    if res.data and project.userId:
        log_event(project.userId, 'status_change', res.data[0]['name'], 'deleted project')

    supabase.table('projects').delete().eq('id', project.id).execute()
    return {"message": "Project deleted successfully"}

@app.get('/renderTask')
async def renderTask(user: dict = Depends(get_current_user)):
    # 1. Fetch all tasks
    res_tasks = supabase.table('tasks').select('*').execute()
    tasks_data = res_tasks.data

    # 2. Fetch users for mapping owner names (to emulate the JOIN)
    res_users = supabase.table('users').select('id, firstName, lastName').execute()
    users_map = {u['id']: u for u in res_users.data}

    # 3. Fetch all dependencies
    res_deps = supabase.table('dependencies').select('*').execute()
    deps_data = res_deps.data

    tasks_map = {}

    # Process tasks
    for t in tasks_data:
        # Parse JSON fields
        if isinstance(t.get('dependencyIds'), str):
            t['dependencyIds'] = json.loads(t['dependencyIds']) if t['dependencyIds'] else []
        elif t.get('dependencyIds') is None:
             t['dependencyIds'] = []

        if isinstance(t.get('tags'), str):
            t['tags'] = json.loads(t['tags']) if t['tags'] else []
        elif t.get('tags') is None:
            t['tags'] = []

        if 'pk' in t: del t['pk']

        # Add owner info
        owner = users_map.get(t.get('ownerId'))
        if owner:
            t['firstName'] = owner.get('firstName')
            t['lastName'] = owner.get('lastName')
            t['ownerName'] = f"{owner.get('firstName') or ''} {owner.get('lastName') or ''}".strip()
        else:
            t['firstName'] = None
            t['lastName'] = None
            t['ownerName'] = "Unknown"

        # Calculate Dependency Counts locally
        t['blocked_by_count'] = sum(1 for d in deps_data if d['to_task_id'] == t['id'] and d['type'] == 'blocked_by')
        t['waiting_on_count'] = sum(1 for d in deps_data if d['to_task_id'] == t['id'] and d['type'] == 'waiting_on')
        t['helpful_if_done_first_count'] = sum(1 for d in deps_data if d['to_task_id'] == t['id'] and d['type'] == 'helpful_if_done_first')

        t['dependents'] = []
        tasks_map[t['id']] = t

    # Build Tree
    dependents_ids = set()
    for dep in deps_data:
        from_id = dep['from_task_id']
        to_id = dep['to_task_id']

        if from_id in tasks_map and to_id in tasks_map:
            if to_id in dependents_ids:
                continue

            dep_task = tasks_map[to_id].copy()
            dep_task['dependencyNote'] = dep.get('note')
            dep_task['dependencyType'] = dep.get('type')

            tasks_map[from_id]['dependents'].append(dep_task)
            dependents_ids.add(to_id)

    # Filter top level
    final_tasks = [t for tid, t in tasks_map.items() if tid not in dependents_ids]
    return final_tasks

@app.post('/createTask')
async def createTask(task: Task, user: dict = Depends(get_current_user)):
    # Check if exists
    res_exists = supabase.table('tasks').select('id').eq('id', task.id).execute()
    exists = bool(res_exists.data)
    action_desc = "updated task" if exists else "created a new task"

    data = task.dict()
    # Serialize JSON fields for DB if Supabase expects strings.
    data['dependencyIds'] = json.dumps(task.dependencyIds)
    data['tags'] = json.dumps(task.tags)

    # Remove computed/extra fields
    if 'ownerName' in data: del data['ownerName']
    if 'userId' in data: del data['userId']

    supabase.table('tasks').upsert(data).execute()

    # Update User
    supabase.table('users').update({'isNew': False}).eq('id', task.ownerId).execute()
    log_event(task.ownerId, 'status_change', task.title, action_desc)

    # Trigger dependency evaluation for this task (in case status changed indirectly or new deps formed)
    evaluate_task_status(task.id)

    # Get user name for response
    res_user = supabase.table('users').select('firstName, lastName').eq('id', task.ownerId).execute()
    if res_user.data:
        u = res_user.data[0]
        task.ownerName = f"{u.get('firstName') or ''} {u.get('lastName') or ''}".strip()

    return task

@app.post('/updateTask')
async def updateTask(task: Task, user: dict = Depends(get_current_user)):
    # Fetch old for logging
    res_old = supabase.table('tasks').select('status, priority').eq('id', task.id).execute()
    old_task = res_old.data[0] if res_old.data else None

    data = task.dict()
    data['dependencyIds'] = json.dumps(task.dependencyIds)
    data['tags'] = json.dumps(task.tags)
    for k in ['ownerName', 'userId']:
        if k in data: del data[k]

    res_update = supabase.table('tasks').update(data).eq('id', task.id).execute()
    if not res_update.data:
         raise HTTPException(status_code=404, detail="Task not found")

    details = 'updated task'
    if old_task:
        if old_task['status'] != task.status:
            details = f"moved to {task.status}"
        elif old_task['priority'] != task.priority:
            details = f"changed priority to {task.priority}"

    actor_id = task.userId if task.userId else task.ownerId
    log_event(actor_id, 'status_change', task.title, details)

    # Trigger dependency logic if status changed
    if old_task and old_task['status'] != task.status:
        # If I changed, my children might need to change.
        # evaluate_task_status(task.id) only checks ME.
        # But evaluate_task_status recursively calls children if *I* change.
        # So we force a check on self, which finds self status = new status,
        # but function checks 'if new != current'.
        # Since we just updated DB, 'current' (from DB) == 'new'.
        # So evaluate_task_status(task.id) will NOT trigger recursion because status matches DB.
        # We must explicitly trigger children.
        res_downstream = supabase.table('dependencies').select('to_task_id').eq('from_task_id', task.id).execute()
        for row in res_downstream.data:
            evaluate_task_status(row['to_task_id'])

    return task

@app.post('/completeTask')
async def complete_task(req: CompleteTaskRequest, user: dict = Depends(get_current_user)):
    res_task = supabase.table('tasks').select('startDate, title').eq('id', req.taskId).execute()
    if not res_task.data:
        raise HTTPException(status_code=404, detail="Task not found")

    task = res_task.data[0]
    now_ts = int(datetime.now(timezone.utc).timestamp())
    start_ts = task['startDate'] or now_ts
    duration_seconds = now_ts - start_ts

    # Update Task Status
    supabase.table('tasks').update({
        'status': 'Done',
        'progress': 100,
        'completedAt': now_ts
    }).eq('id', req.taskId).execute()

    # Progression
    res_user = supabase.table('users').select('avg_task_completion_time, completed_tasks_count').eq('id', req.userId).execute()
    if res_user.data:
        u = res_user.data[0]
        old_avg = u.get('avg_task_completion_time') or 0
        old_count = u.get('completed_tasks_count') or 0
        new_count = old_count + 1
        new_avg = ((old_avg * old_count) + duration_seconds) / new_count

        supabase.table('users').update({
            'avg_task_completion_time': new_avg,
            'completed_tasks_count': new_count,
            'level': int(new_count / 5) + 1
        }).eq('id', req.userId).execute()

    # Update downstream tasks
    res_down = supabase.table('dependencies').select('to_task_id').eq('from_task_id', req.taskId).execute()
    for row in res_down.data:
        evaluate_task_status(row['to_task_id'])

    return {"message": "Task completed successfully"}

@app.post('/deleteTask')
async def delete_task(req: DeleteRequest, user: dict = Depends(get_current_user)):
    res_task = supabase.table('tasks').select('title').eq('id', req.id).execute()
    task_title = res_task.data[0]['title'] if res_task.data else "Unknown Task"

    # Orphan Prevention: Cleanup Dependencies and Assignments manually
    supabase.table('dependencies').delete().eq('from_task_id', req.id).execute()
    supabase.table('dependencies').delete().eq('to_task_id', req.id).execute()
    supabase.table('task_persona_assignments').delete().eq('task_id', req.id).execute()

    supabase.table('tasks').delete().eq('id', req.id).execute()

    if req.userId:
        log_event(req.userId, 'status_change', task_title, 'Task Deleted')

    return {"message": "Task was successfully deleted"}

@app.post("/dependencies")
async def create_dependency(dep: DependencyCreate, user: dict = Depends(get_current_user)):
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

    # Check the dependent task immediately
    evaluate_task_status(dep.to_task_id)

    res_from = supabase.table('tasks').select('title').eq('id', dep.from_task_id).execute()
    res_to = supabase.table('tasks').select('title').eq('id', dep.to_task_id).execute()

    if res_from.data and res_to.data:
        details = f"set '{res_to.data[0]['title']}' as dependent on '{res_from.data[0]['title']}'"
        log_event(dep.userId, 'dependency_change', res_to.data[0]['title'], details)

    return {"id": dep_id, **dep.dict()}

@app.get("/tasks/{task_id}/dependencies")
async def get_task_dependencies(task_id: str, user: dict = Depends(get_current_user)):
    # Blocked By
    res_blocked = supabase.table('dependencies').select('*').eq('to_task_id', task_id).execute()
    blocked_data = res_blocked.data

    # Blocking
    res_blocking = supabase.table('dependencies').select('*').eq('from_task_id', task_id).execute()
    blocking_data = res_blocking.data

    # Gather all related task IDs
    ids = set()
    for d in blocked_data: ids.add(d['from_task_id'])
    for d in blocking_data: ids.add(d['to_task_id'])

    tasks_map = {}
    if ids:
        res_t = supabase.table('tasks').select('id, title, status').in_('id', list(ids)).execute()
        tasks_map = {t['id']: t for t in res_t.data}

    # Enrich data
    for d in blocked_data:
        t = tasks_map.get(d['from_task_id'])
        d['from_task_title'] = t['title'] if t else None
        d['from_task_status'] = t['status'] if t else None

    for d in blocking_data:
        t = tasks_map.get(d['to_task_id'])
        d['to_task_title'] = t['title'] if t else None
        d['to_task_status'] = t['status'] if t else None

    return {"blocked_by": blocked_data, "blocking": blocking_data}

@app.post("/dependencies/lookup")
async def lookup_dependency(data: DependencyLookup, user: dict = Depends(get_current_user)):
    res = supabase.table('dependencies').select('*')\
        .eq('from_task_id', data.from_task_id)\
        .eq('to_task_id', data.to_task_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Dependency not found")
    return res.data[0]

@app.patch("/dependencies/{dependency_id}")
async def update_dependency(dependency_id: str, dep_update: DependencyUpdate, user: dict = Depends(get_current_user)):
    res_dep = supabase.table('dependencies').select('to_task_id').eq('id', dependency_id).execute()
    if not res_dep.data:
        raise HTTPException(status_code=404, detail="Dependency not found")
    task_id = res_dep.data[0]['to_task_id']

    updates = {}
    if dep_update.type: updates['type'] = dep_update.type.value
    if dep_update.note is not None: updates['note'] = dep_update.note

    if not updates:
        raise HTTPException(status_code=400, detail="No update fields provided")

    supabase.table('dependencies').update(updates).eq('id', dependency_id).execute()
    evaluate_task_status(task_id)
    return {"message": "Dependency updated successfully"}

@app.delete("/dependencies/{dependency_id}/{user_id}")
async def delete_dependency(dependency_id: str, user_id: str, user: dict = Depends(get_current_user)):
    res_dep = supabase.table('dependencies').select('from_task_id, to_task_id').eq('id', dependency_id).execute()
    if not res_dep.data:
        raise HTTPException(status_code=404, detail="Dependency not found")

    dep = res_dep.data[0]
    supabase.table('dependencies').delete().eq('id', dependency_id).execute()

    # Re-evaluate the dependent task
    evaluate_task_status(dep['to_task_id'])

    res_from = supabase.table('tasks').select('title').eq('id', dep['from_task_id']).execute()
    res_to = supabase.table('tasks').select('title').eq('id', dep['to_task_id']).execute()

    if res_from.data and res_to.data:
        details = f"removed dependency between '{res_to.data[0]['title']}' and '{res_from.data[0]['title']}'"
        log_event(user_id, 'dependency_change', res_to.data[0]['title'], details)

    return {"message": "Dependency deleted successfully"}

@app.get("/tasks/{task_id}/dependency-summary")
async def get_dependency_summary(task_id: str, user: dict = Depends(get_current_user)):
    res_deps = supabase.table('dependencies').select('*').eq('to_task_id', task_id).execute()
    deps = res_deps.data

    counts = {}
    waiting_notes = []
    blocked_by_ids = []

    for d in deps:
        d_type = d['type']
        counts[d_type] = counts.get(d_type, 0) + 1
        if d_type == 'waiting_on' and d.get('note'):
            waiting_notes.append(d['note'])
        if d_type == 'blocked_by':
            blocked_by_ids.append(d['from_task_id'])

    blocking_tasks = []
    if blocked_by_ids:
        res_t = supabase.table('tasks').select('title').in_('id', blocked_by_ids).neq('status', 'Done').execute()
        blocking_tasks = [t['title'] for t in res_t.data]

    return {
        "blocked_by_count": counts.get('blocked_by', 0),
        "waiting_on_count": counts.get('waiting_on', 0),
        "helpful_if_done_first_count": counts.get('helpful_if_done_first', 0),
        "blocking_tasks": blocking_tasks,
        "waiting_notes": waiting_notes
    }

# --- Envoy AI ---

@app.get("/envoy/task/{task_id}/friction")
async def get_envoy_friction(task_id: str, user: dict = Depends(get_current_user)):
    # Blockers
    res_blk = supabase.table('dependencies').select('from_task_id').eq('to_task_id', task_id).eq('type', 'blocked_by').execute()
    from_ids = [d['from_task_id'] for d in res_blk.data]

    blockers = []
    if from_ids:
        res_t = supabase.table('tasks').select('title, status, ownerId').in_('id', from_ids).neq('status', 'Done').execute()
        if res_t.data:
            owner_ids = list(set(t['ownerId'] for t in res_t.data))
            res_u = supabase.table('users').select('id, firstName, lastName').in_('id', owner_ids).execute()
            u_map = {u['id']: u for u in res_u.data}

            for t in res_t.data:
                u = u_map.get(t['ownerId'])
                name = f"{u.get('firstName')} {u.get('lastName')}" if u else "Unknown"
                blockers.append(f"{t['title']} (owned by {name})")

    # External waits
    res_wait = supabase.table('dependencies').select('note').eq('to_task_id', task_id).eq('type', 'waiting_on').neq('note', None).execute()
    external_waits = [d['note'] for d in res_wait.data]

    # Soft Dependencies
    res_soft = supabase.table('dependencies').select('from_task_id').eq('to_task_id', task_id).eq('type', 'helpful_if_done_first').execute()
    s_ids = [d['from_task_id'] for d in res_soft.data]
    soft_dependencies = []
    if s_ids:
        res_t = supabase.table('tasks').select('title').in_('id', s_ids).neq('status', 'Done').execute()
        soft_dependencies = [t['title'] for t in res_t.data]

    return { "blockers": blockers, "external_waits": external_waits, "soft_dependencies": soft_dependencies }

@app.post("/envoy/suggest")
async def suggest(req: EnvoyRequest, request: Request, user: dict = Depends(get_current_user)):
    user_id = user['sub']

    rows = []
    if req.all or not req.task_id:
        # fetch all tasks for this user
        res_t = supabase.table('tasks').select(
            'id, title, status, priority, plannedDuration, dependencyIds'
        ).eq('ownerId', user_id).execute()
        rows = res_t.data
    else:
        # single task
        res_t = supabase.table('tasks').select(
            'id, title, status, priority, plannedDuration, dependencyIds'
        ).eq('id', req.task_id).execute()
        rows = res_t.data

    # parse dependencies
    tasks_list = []
    for row in rows:
        dep_ids = row.get('dependencyIds')
        if isinstance(dep_ids, str):
            dep_ids = safe_json_loads(dep_ids) or []
        tasks_list.append({
            "id": row['id'],
            "title": row['title'],
            "status": row['status'],
            "priority": row['priority'],
            "plannedDuration": row['plannedDuration'],
            "dependencyIds": dep_ids
        })

    parsed = await generate_envoy_proposals(tasks_list, req.context_text)

    proposals = [
        {
            "id": str(uuid.uuid4()),
            "field": p.get("field", ""),
            "suggested": p.get("suggested", ""),
            "reason": p.get("reason", "")
        }
        for p in parsed if isinstance(p, dict)
    ]

    log_event(user_id, "ai_call", "envoy_suggest", f"Requested suggestions for {len(tasks_list)} task(s)")

    return {"task_id": req.task_id, "proposals": proposals}

@app.post("/envoy/apply")
def apply(req: EnvoyRequest, user: dict = Depends(get_current_user)):
    res_t = supabase.table('tasks').select('title, ownerId').eq('id', req.task_id).execute()
    task = res_t.data[0] if res_t.data else None
    task_title = task['title'] if task else "Unknown Task"
    owner_id = task['ownerId'] if task else "unknown"

    applied = []
    skipped_fields = []

    try:
        for p in req.proposals or []:
            field = p.field
            suggested = p.suggested

            if field not in AI_MUTABLE_FIELDS and field not in AI_OPTIONAL_FIELDS:
                skipped_fields.append(f"{field} (immutable)")
                continue

            if field == "status" and suggested not in VALID_STATUS:
                skipped_fields.append(f"{field} (invalid value: {suggested})")
                continue

            if field == "priority" and suggested not in VALID_PRIORITY:
                skipped_fields.append(f"{field} (invalid value: {suggested})")
                continue

            val = json.dumps(suggested) if isinstance(suggested, (list, dict)) else suggested
            supabase.table('tasks').update({field: val}).eq('id', req.task_id).execute()
            applied.append(field)

        if applied:
             details = f"applied AI updates: {', '.join(applied)}"
             log_event(owner_id, 'status_change', task_title, details)

             # If status or priority changed, trigger downstream checks
             if "status" in applied:
                 # Check children since I changed
                 res_downstream = supabase.table('dependencies').select('to_task_id').eq('from_task_id', req.task_id).execute()
                 for row in res_downstream.data:
                     evaluate_task_status(row['to_task_id'])

        return {
            "status": "success",
            "message": "Task update processed",
            "applied_fields": applied,
            "skipped_fields": skipped_fields
        }
    except Exception as e:
        print(f"Apply Error: {e}")
        return {"error": str(e)}

@app.get('/renderPersona')
async def get_personas(user: dict = Depends(get_current_user)):
    """Get ONLY the current user's personas"""
    user_id = user.get('sub')
    
    try:
        # FIXED: Only fetch personas belonging to the current user
        res = supabase.table('personas').select('*').eq('user_id', user_id).execute()
        return res.data
    except Exception as e:
        print(f"Error fetching personas: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post('/createPersona')
async def createPersona(p: PersonaCreate, user: dict = Depends(get_current_user)):
    new_id = str(uuid.uuid4())
    data = p.dict()
    data['id'] = new_id
    supabase.table('personas').insert(data).execute()
    return data

@app.post('/deletePersona')
async def deletePersona(data: PersonaDelete, user: dict = Depends(get_current_user)):
    res = supabase.table('personas').delete().eq('id', data.id).execute()
    if not res.data:
        return {"message": "Persona not found, nothing deleted"}
    return {"message": "Persona deleted successfully"}


@app.post('/users/{user_id}/change-password')
async def change_password(
    user_id: str,
    req: PasswordChangeRequest,
    user: dict = Depends(get_current_user)
):
    """
    Change user password
    """
    if user_id != user.get('sub'):
        raise HTTPException(status_code=403, detail="Cannot change other users' password")
    
    try:
        # Use Supabase admin to update password
        supabase.auth.admin.update_user_by_id(
            user_id,
            {"password": req.newPassword}
        )
        return {"message": "Password updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update password: {str(e)}")


@app.get("/users/{user_id}")
async def get_user_profile(user_id: str, current_user: dict = Depends(get_current_user)):
    """
    Restored from OLD-FILE.PY logic, updated for Supabase.
    This stops the 404 error in roadmap.tsx.
    """
    try:
        # Try to fetch from 'users' table (common Supabase pattern)
        res = supabase.table('users').select("*").eq('id', user_id).single().execute()

        if res.data:
            return res.data

        # Fallback: If no profile exists, return data from the JWT/Auth metadata
        # This ensures the frontend always gets a valid object
        return {
            "id": user_id,
            "firstName": current_user.get("user_metadata", {}).get("full_name", "New"),
            "username": current_user.get("email", "User").split('@')[0],
            "avatar": f"https://ui-avatars.com/api/?name={user_id}&background=random",
            "baseCapacity": 100
        }
    except Exception as e:
        print(f"Error in get_user_profile: {e}")
        # Return a safe default to prevent frontend crashes
        return {"id": user_id, "firstName": "User", "baseCapacity": 100}

# --- RESTORED TEAM MEMBERS ENDPOINT ---
@app.get("/projects/{project_id}/team")
async def get_project_team(project_id: str, user: dict = Depends(get_current_user)):
    """
    Roadmap.tsx often calls this to populate the user list.
    """
    try:
        # In Supabase, we fetch all users
        res = supabase.table('users').select("*").execute()
        return res.data
    except Exception:
        return []

@app.post('/team/add_member')
async def add_team_member(req: AddMemberRequest, user: dict = Depends(get_current_user)):
    res_admin = supabase.table('users').select('role, companyName').eq('id', req.userId).execute()
    if not res_admin.data:
         raise HTTPException(status_code=404, detail="Requester not found")
    admin = res_admin.data[0]

    if admin.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Only admins can add team members")

    if not admin.get('companyName'):
        raise HTTPException(status_code=400, detail="Admin must belong to a company/organization")

    res_update = supabase.table('users').update({'companyName': admin['companyName']}).eq('username', req.username).execute()
    if not res_update.data:
        raise HTTPException(status_code=404, detail="User with this username not found")

    log_event(req.userId, 'status_change', 'Team', f"added {req.username}")
    return {"message": f"User {req.username} added to {admin['companyName']}"}

@app.post('/team/update_skills')
async def update_skills(req: UpdateSkillsRequest, user: dict = Depends(get_current_user)):
    res_req = supabase.table('users').select('role, companyName').eq('id', req.requesterId).execute()
    if not res_req.data:
        raise HTTPException(status_code=404, detail="Requester not found")
    requester = res_req.data[0]

    if req.requesterId != req.targetUserId:
        if requester.get('role') != 'admin':
             raise HTTPException(status_code=403, detail="Unauthorized")

    supabase.table('users').update({'skills': json.dumps(req.skills)}).eq('id', req.targetUserId).execute()
    return {"message": "Skills updated"}

@app.get('/team/overview')
async def team_overview(userId: str, user: dict = Depends(get_current_user)):
    return {
        "coordinationDebt": "Medium",
        "leakageScore": 12,
        "dependencyRisk": "High"
    }

# ==========================================
# TEAM MANAGEMENT ENDPOINTS - COMPLETE
# ==========================================

class AddTeamMemberRequest(BaseModel):
    userId: str
    username: str

class RemoveTeamMemberRequest(BaseModel):
    userId: str
    memberId: str

@app.get('/team/members')
async def get_team_members(userId: str, user: dict = Depends(get_current_user)):
    """
    Get all team members for the current user
    Returns: Current user + all users they've added to their team
    """
    try:
        # Get the current user's info
        res_owner = supabase.table('users').select('id, firstName, lastName, role, skills').eq('id', userId).execute()
        if not res_owner.data:
            return []
        
        owner_data = res_owner.data[0]
        
        # Get all team members added by this user
        res_team = supabase.table('team_members').select('member_id').eq('owner_id', userId).execute()
        member_ids = [tm['member_id'] for tm in res_team.data]
        
        # Fetch details for all team members
        team_members_list = []
        if member_ids:
            res_members = supabase.table('users').select('id, firstName, lastName, role, skills').in_('id', member_ids).execute()
            team_members_list = res_members.data
        
        # Combine owner + team members
        all_members = [owner_data] + team_members_list
        
        # Format the response
        result = []
        for member in all_members:
            fname = member.get('firstName', '')
            lname = member.get('lastName', '')
            skills = member.get('skills', [])
            if isinstance(skills, str):
                try:
                    skills = json.loads(skills)
                except:
                    skills = []
            
            result.append({
                'id': member['id'],
                'name': f"{fname} {lname}".strip() or "User",
                'role': member.get('role', 'Member'),
                'skills': skills,
                'attentionScore': 75,  # Mock data - calculate based on tasks
                'dependencyLoad': 0,    # Mock data - calculate based on dependencies
                'status': 'online',
                'workload': 0,
                'currentTask': None
            })
        
        return result
    except Exception as e:
        print(f"Error fetching team members: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post('/team/add_member')
async def add_team_member(req: AddTeamMemberRequest, user: dict = Depends(get_current_user)):
    """
    Add a team member by their username
    """
    try:
        # Validate that the requester matches the userId
        if user.get('sub') != req.userId:
            raise HTTPException(status_code=403, detail="Unauthorized")
        
        # Find user by username
        res_user = supabase.table('users').select('id, username').eq('username', req.username).execute()
        
        if not res_user.data:
            raise HTTPException(status_code=404, detail=f"User '{req.username}' not found")
        
        target_user = res_user.data[0]
        target_user_id = target_user['id']
        
        # Prevent adding yourself
        if target_user_id == req.userId:
            raise HTTPException(status_code=400, detail="Cannot add yourself to your team")
        
        # Check if already added
        res_existing = supabase.table('team_members').select('id').eq('owner_id', req.userId).eq('member_id', target_user_id).execute()
        
        if res_existing.data:
            raise HTTPException(status_code=400, detail=f"'{req.username}' is already on your team")
        
        # Add team member
        supabase.table('team_members').insert({
            'owner_id': req.userId,
            'member_id': target_user_id
        }).execute()
        
        # Log the event
        log_event(req.userId, 'team_member_added', f"Added {req.username} to team", f"Added team member: {req.username}")
        
        return {"message": f"Successfully added {req.username} to your team"}
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error adding team member: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post('/team/remove_member')
async def remove_team_member(req: RemoveTeamMemberRequest, user: dict = Depends(get_current_user)):
    """
    Remove a team member
    """
    try:
        # Validate that the requester matches the userId
        if user.get('sub') != req.userId:
            raise HTTPException(status_code=403, detail="Unauthorized")
        
        # Prevent removing yourself (though you can't add yourself anyway)
        if req.memberId == req.userId:
            raise HTTPException(status_code=400, detail="Cannot remove yourself")
        
        # Get member info for logging
        res_member = supabase.table('users').select('username, firstName, lastName').eq('id', req.memberId).execute()
        if res_member.data:
            member_data = res_member.data[0]
            member_name = f"{member_data.get('firstName', '')} {member_data.get('lastName', '')}".strip() or member_data.get('username', 'Unknown')
        else:
            member_name = "Unknown"
        
        # Delete team member relationship
        res = supabase.table('team_members').delete().eq('owner_id', req.userId).eq('member_id', req.memberId).execute()
        
        if not res.data:
            raise HTTPException(status_code=404, detail="Team member not found")
        
        # Log the event
        log_event(req.userId, 'team_member_removed', f"Removed {member_name} from team", f"Removed team member: {member_name}")
        
        return {"message": f"Successfully removed {member_name} from your team"}
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error removing team member: {e}")
        raise HTTPException(status_code=500, detail=str(e))




@app.get('/pulse/events')
async def get_pulse_events(user: dict = Depends(get_current_user)):
    res_logs = supabase.table('activity_log').select('*').order('timestamp', desc=True).limit(20).execute()
    logs = res_logs.data

    user_ids = list(set(l['userId'] for l in logs))
    users_map = {}
    if user_ids:
        res_u = supabase.table('users').select('id, username').in_('id', user_ids).execute()
        users_map = {u['id']: u for u in res_u.data}

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






@app.patch("/tasks/{task_id}")
async def patch_task(task_id: str, updates: dict = Body(...), user: dict = Depends(get_current_user)):
    """Essential for drag-and-drop status changes (Todo -> Done)."""
    res = supabase.table('tasks').update(updates).eq('id', task_id).execute()
    return res.data

@app.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user: dict = Depends(get_current_user)):
    """Restored delete functionality."""
    supabase.table('tasks').delete().eq('id', task_id).execute()
    return {"status": "deleted"}

@app.get("/pulse/activity/{user_id}")
async def get_activity_logs(user_id: str, user: dict = Depends(get_current_user)):
    """Restored the 'Activity Feed' logic from your OLD-FILE.PY."""
    res = supabase.table('activity_log').select("*").eq('userId', user_id).order('created_at', desc=True).limit(20).execute()
    return res.data





@app.get("/users/{user_id}/personas")
async def get_user_personas(user_id: str, user: dict = Depends(get_current_user)):
    """Restored Persona logic (e.g., Designer vs Developer roles for one user)."""
    res = supabase.table('personas').select("*").eq('ownerId', user_id).execute()
    return res.data

@app.get('/envoy/interventions')
async def get_interventions(userId: str, user: dict = Depends(get_current_user)):
    return [
        {"id": "1", "type": "warning", "message": "Ownership ambiguous for Feature X", "scope": "team"},
        {"id": "2", "type": "critical", "message": "Person A is a dependency bottleneck", "scope": "team"},
        {"id": "3", "type": "info", "message": "You are context-switching across 5 workstreams", "scope": "personal"}
    ]

@app.post('/envoy/auto-balance')
async def auto_balance(req: AutoBalanceRequest, user: dict = Depends(get_current_user)):
    res_u = supabase.table('users').select('role, companyName').eq('id', req.userId).execute()
    user_info = res_u.data[0] if res_u.data else None
    role = user_info['role'] if user_info else 'user'
    company = user_info['companyName'] if user_info else None

    prompt = ""
    tasks = []
    team_members = []
    personas = []

    if role == 'admin' and company:
        # Team Balance
        res_m = supabase.table('users').select('id, firstName, avg_task_completion_time, completed_tasks_count, skills').eq('companyName', company).execute()
        team_members = res_m.data

        member_ids = [m['id'] for m in team_members]
        if member_ids:
            res_t = supabase.table('tasks').select('*').in_('ownerId', member_ids).neq('status', 'Done').execute()
            tasks = res_t.data

        prompt = f"""
        You are an expert Project Manager AI.
        Goal: Redistribute tasks among team members.
        Team Stats: {json.dumps(team_members)}
        Tasks: {json.dumps([{k: v for k, v in t.items() if k in ['id', 'title', 'priority', 'ownerId', 'plannedDuration']} for t in tasks])}
        Instructions: Assign tasks based on avg_task_completion_time and skills.
        Return JSON: {{ "assignments": [ {{ "task_id": "...", "new_owner_id": "..." }} ] }}
        """
    else:
        # Persona Balance
        res_t = supabase.table('tasks').select('*').eq('ownerId', req.userId).execute()
        tasks = res_t.data

        res_p = supabase.table('personas').select('*').eq('user_id', req.userId).execute()
        personas = res_p.data

        prompt = f"""
        You are an intelligent task manager. User ID: {req.userId}
        Current Personas: {json.dumps([{k: v for k, v in p.items() if k != 'pk'} for p in personas])}
        Tasks: {json.dumps([{k: v for k, v in t.items() if k != 'pk'} for t in tasks])}
        Goal: Organize tasks into personas to balance workload.
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
    result = safe_json_loads(response.text)

    if not result:
        return {"status": "error", "message": "Failed to parse AI response from Auto-Balance"}

    if role == 'admin' and company:
        for assign in result.get("assignments", []):
            supabase.table('tasks').update({'ownerId': assign.get("new_owner_id")}).eq('id', assign.get("task_id")).execute()
    else:
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
            supabase.table('personas').delete().eq('id', del_id).execute()

        for assign in result.get("assignments", []):
            if pid := persona_map.get(assign.get("persona_name")):
                supabase.table('tasks').update({'personaId': pid}).eq('id', assign.get("task_id")).execute()

    return {"status": "success", "changes": result}

@app.get('/pulse/{user_id}')
async def get_pulse(user_id: str, user: dict = Depends(get_current_user)):
    res_t = supabase.table('tasks').select('*').eq('ownerId', user_id).neq('status', 'Done').execute()
    rows = res_t.data

    tasks = []
    for row in rows:
        t = dict(row)
        try:
            # Handle both JSONB (already dict/list) or Text (needs loads)
            dep_ids = t.get('dependencyIds')
            t['dependencyIds'] = json.loads(dep_ids) if isinstance(dep_ids, str) else (dep_ids or [])

            tags = t.get('tags')
            t['tags'] = json.loads(tags) if isinstance(tags, str) else (tags or [])
        except:
            t['dependencyIds'] = []
            t['tags'] = []
        if 'pk' in t: del t['pk']
        tasks.append(t)

    current_task = next((t for t in tasks if t['status'] == 'In Progress'), None)

    candidates = [t for t in tasks if t['status'] != 'In Progress']
    prio_map = {"High": 3, "Medium": 2, "Low": 1}
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

@app.get('/pulse/activity')
async def get_pulse_activity(userId: str, user: dict = Depends(get_current_user)):
    """
    FIXED: Get activity ONLY for the current user (no team concept yet)
    In a real team app, you'd query a team_members table to get the team
    """
    try:
        # FIXED: Only show the current user's activity
        res_a = supabase.table('activity_log').select('*').eq('userId', userId).order('timestamp', desc=True).limit(50).execute()
        rows = res_a.data

        # Get user info
        res_user = supabase.table('users').select('id, firstName, lastName, role').eq('id', userId).execute()
        user_data = res_user.data[0] if res_user.data else {}
        
        fname = user_data.get('firstName', '')
        lname = user_data.get('lastName', '')
        role = user_data.get('role', 'Member')

        events = []
        for t in rows:
            avatar = f"https://ui-avatars.com/api/?name={fname}+{lname}&background=random"

            events.append({
                "id": f"evt_{t['id']}",
                "type": t['type'],
                "actor": {
                    "id": userId,
                    "name": f"{fname} {lname}".strip() or "User",
                    "role": role,
                    "avatar": avatar
                },
                "targetTask": t['targetTask'],
                "targetLink": t.get('targetLink', '#'),
                "details": t['details'],
                "timestamp": time_ago(t['timestamp']),
                "actionRequired": False
            })

        # Add welcome event
        events.append({
            "id": 'se1', 
            "type": 'status_change',
            "actor": { 
                "id": 'sys', 
                "name": 'System', 
                "role": 'Bot', 
                "avatar": 'https://ui-avatars.com/api/?name=System&background=000&color=fff', 
                "status": 'online', 
                "workload": 0 
            },
            "targetTask": 'Welcome to TaskLinex', 
            "targetLink": '#',
            "details": 'Your TaskLinex account has been created.', 
            "timestamp": 'Joined'
        })

        return events
    except Exception as e:
        print(f"Error fetching activity: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get('/pulse/stats')
async def get_pulse_stats(userId: str, user: dict = Depends(get_current_user)):
    res_u = supabase.table('users').select('avg_task_completion_time, isNew').eq('id', userId).execute()
    user = res_u.data[0] if res_u.data else None

    avg_time = user.get('avg_task_completion_time') if user else 0
    is_new = bool(user.get('isNew')) if user else True

    velocity = "Medium"
    if avg_time > 0 and avg_time < 3600: velocity = "High"
    elif avg_time > 14400: velocity = "Low"

    # Blockers (count)
    res_b = supabase.table('tasks').select('*', count='exact').eq('priority', 'High').neq('status', 'Done').execute()
    blocker_count = res_b.count

    # Sprint stats (Total DB tasks for demo)
    res_done = supabase.table('tasks').select('*', count='exact').eq('status', 'Done').execute()
    completed = res_done.count

    res_rem = supabase.table('tasks').select('*', count='exact').neq('status', 'Done').execute()
    remaining = res_rem.count

    return {
        "velocity": velocity,
        "blockers": { "count": blocker_count, "type": "blocker" },
        "sprint": { "daysLeft": 5, "completed": completed, "remaining": remaining },
        "isNewUser": is_new
    }

@app.get('/analytics/ripple')
async def get_ripple_graph(userId: str, user: dict = Depends(get_current_user)):
    # 1. Get all tasks for this user (active only for ripple)
    res_tasks = supabase.table('tasks').select('id, title, status, priority').eq('ownerId', userId).neq('status', 'Done').execute()
    my_tasks = res_tasks.data or []
    
    if not my_tasks:
        return {"tasks": [], "edges": []}

    my_task_ids = [t['id'] for t in my_tasks]
    
    # 2. Get dependencies (both directions)
    res_down = supabase.table('dependencies').select('from_task_id, to_task_id').in_('from_task_id', my_task_ids).execute()
    res_up = supabase.table('dependencies').select('from_task_id, to_task_id').in_('to_task_id', my_task_ids).execute()
    
    edges = (res_down.data or []) + (res_up.data or [])
    
    # 3. Identify all relevant task IDs
    all_ids = set(my_task_ids)
    for e in edges:
        all_ids.add(e['from_task_id'])
        all_ids.add(e['to_task_id'])
        
    # 4. Fetch details for missing tasks
    missing_ids = list(all_ids - set(my_task_ids))
    other_tasks = []
    if missing_ids:
        res_others = supabase.table('tasks').select('id, title, status, priority').in_('id', missing_ids).execute()
        other_tasks = res_others.data or []
        
    combined_tasks = my_tasks + other_tasks
    
    # 5. Format
    final_tasks = []
    seen_ids = set()
    
    for t in combined_tasks:
        if t['id'] in seen_ids: continue
        seen_ids.add(t['id'])
        
        s = "Active"
        if t.get('status') == 'Blocked': s = "Blocked"
        elif t.get('status') in ['At Risk', 'Stalled']: s = "Stalled"
        
        final_tasks.append({
            "id": t['id'],
            "priority": t.get('priority', 'Medium'),
            "status": s
        })
        
    # Deduplicate edges
    unique_edges = []
    seen_edges = set()
    for e in edges:
        k = f"{e['from_task_id']}_{e['to_task_id']}"
        if k not in seen_edges:
            seen_edges.add(k)
            unique_edges.append(e)

    return {
        "tasks": final_tasks,
        "edges": unique_edges
    }

@app.get('/analytics/{user_id}')
async def get_analytics(user_id: str, user: dict = Depends(get_current_user)):
    res_all = supabase.table('tasks').select('*').execute()
    all_rows = res_all.data

    all_tasks_map = {}
    user_tasks = []

    for t in all_rows:
        try:
            # Safely handle JSON
            dep = t.get('dependencyIds')
            t['dependencyIds'] = json.loads(dep) if isinstance(dep, str) else (dep or [])
        except:
            t['dependencyIds'] = []

        all_tasks_map[t['id']] = t
        if t['ownerId'] == user_id:
            user_tasks.append(t)

    # 1. Blocked Flow
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

    # 2. Stalled
    stalled_count = 0
    now = datetime.now().timestamp()
    STALL_THRESHOLD = 3 * 24 * 3600
    for t in user_tasks:
        if t['status'] == 'In Progress':
            start_time = t['startDate'] if t['startDate'] else now
            if (now - start_time) > STALL_THRESHOLD:
                stalled_count += 1

    # 3. Velocity Trend
    velocity_map = {}
    completed_tasks = [t for t in user_tasks if t['status'] == 'Done' and t.get('completedAt')]
    completed_tasks.sort(key=lambda x: x['completedAt'])

    for t in completed_tasks:
        comp_time = t['completedAt']
        start_time = t['startDate'] if t['startDate'] else comp_time
        duration_hours = max(0, (comp_time - start_time) / 3600.0)
        dt = datetime.fromtimestamp(comp_time)
        week_label = dt.strftime("%b %d")

        if week_label not in velocity_map: velocity_map[week_label] = []
        velocity_map[week_label].append(duration_hours)

    velocity_trend = [{"name": k, "value": round(sum(v)/len(v), 1)} for k, v in velocity_map.items()]
    velocity_trend = velocity_trend[-7:]

    # 4. Heatmap
    day_map = {}
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    for i in range(14):
        day_map[(today + timedelta(days=i)).strftime("%Y-%m-%d")] = 0

    for t in user_tasks:
        if t['status'] == 'Done': continue
        planned_hours = (t['plannedDuration'] or 3600) / 3600.0
        days_needed = max(1, int(planned_hours / 4))
        load_per_day = planned_hours / days_needed

        for i in range(days_needed):
            d_str = (today + timedelta(days=i)).strftime("%Y-%m-%d")
            if d_str in day_map: day_map[d_str] += load_per_day

    heatmap_data = [{"date": k, "count": round(v, 1)} for k, v in day_map.items()]

    return {
        "blockedFlow": blocked_count,
        "stalledCount": stalled_count,
        "velocityTrend": velocity_trend,
        "capacityHeatmap": heatmap_data
    }

# FOR TESTING PURPOSES ONLY
@app.get("/test-auth")
async def test_auth(user: dict = Depends(get_current_user)):
    return {
        "message": "Auth working!",
        "user_id": user.get('sub'),
        "email": user.get('email')
    }


@app.post('/pulse/set_focus')
async def set_focus(req: SetFocusRequest, user: dict = Depends(get_current_user)):
    # Fetch task title for logging
    res_t = supabase.table('tasks').select('title').eq('id', req.taskId).execute()
    task_title = res_t.data[0]['title'] if res_t.data else "Task"

    # 1. Pause other 'In Progress' tasks for this user
    supabase.table('tasks').update({'status': 'Todo'}).eq('ownerId', req.userId).eq('status', 'In Progress').execute()

    # 2. Set the selected task to 'In Progress'
    supabase.table('tasks').update({'status': 'In Progress'}).eq('id', req.taskId).execute()

    log_event(req.userId, 'status_change', task_title, 'started working on')
    return {"message": "Focus updated"}

if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=SERVER_PORT, reload=True)