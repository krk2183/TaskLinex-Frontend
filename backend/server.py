from fastapi import FastAPI, HTTPException, status, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime, timedelta, timezone
import json,os,jwt,sqlite3,bcrypt,uuid,uvicorn,dotenv,socket
from contextlib import asynccontextmanager
from fastapi.exceptions import RequestValidationError
from pathlib import Path
from fastapi.responses import JSONResponse
from google import genai 
# Server initialization
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

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
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'data', 'tasklinex.db')
SERVER_PORT = int(os.getenv("NEXT_PUBLIC_SERVER_PORT", 8000))

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
    'http://192.168.0.113:8000',
    "https://bushlike-nonvibrating-velma.ngrok-free.dev"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
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
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            companyName TEXT
        )
    ''')

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
        CREATE TABLE IF NOT EXISTS dependencyIds (
            pk INTEGER PRIMARY KEY AUTOINCREMENT,
            id TEXT NOT NULL UNIQUE,
            task_id TEXT NOT NULL,
            depends_on_id TEXT NOT NULL,
            type TEXT NOT NULL,
            FOREIGN KEY (task_id) REFERENCES tasks(id),
            FOREIGN KEY (depends_on_id) REFERENCES tasks(id)
        )
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
    personaId: Optional[str] = None
    dependencyIds: List[str] = []
    tags: List[str] = []

class Dependency(BaseModel):
    task_id: str
    depends_on_id: str
    type: str = Field(..., pattern="^(blocks|relates_to)$")

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
    email: str
    password: str
    companyName: Optional[str] = None
    rememberMe: bool = False

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

# Endpoints
@app.get('/')
async def root():
    return {"status":'ok',"message": "TaskLinex API is active"}

@app.post('/signup')
async def signup(user: UserCreate, response: Response):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE email = ?', (user.email,))
    existing_user = cursor.fetchone()

    if existing_user:
        conn.close()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered.")
    
    hashed_pass = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt())
    user_id = str(uuid.uuid4())
    
    cursor.execute(
        'INSERT INTO users (id, firstName, lastName, email, password, companyName) VALUES (?, ?, ?, ?, ?, ?)', 
        (user_id, user.firstName, user.lastName, user.email, hashed_pass.decode('utf-8'), user.companyName)
    )
    conn.commit()
    conn.close()

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

    return {"access_token": token, "token_type": "bearer"}

@app.post('/login')
async def login(form_data: UserLogin, response: Response):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("SELECT password, id FROM users WHERE email = ?", (form_data.email,))
    result = cursor.fetchone()
    conn.close()

    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    stored_hash_str = result[0]
    user_id = result[1]
    
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
    payload = {'sub': form_data.email, 'id': user_id, 'exp': expire}
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
    
    return {"access_token": token, "token_type": "bearer"}

@app.get('/renderTask')
async def renderTask():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM tasks")
        rows = cursor.fetchall()
        tasks = []
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
            tasks.append(task_dict)
        return tasks
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
        cursor.execute('''
            INSERT INTO tasks (id, projectId, title, startDate, duration, plannedDuration, progress, status, priority, ownerId, personaId, dependencyIds, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (task.id, task.projectId, task.title, task.startDate, task.duration, task.plannedDuration, task.progress, task.status, task.priority, task.ownerId, task.personaId, json.dumps(task.dependencyIds), json.dumps(task.tags)))
        conn.commit()
        return task
    except Exception as e:
        print(f"Error creating task: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.post('/updateTask')
async def updateTask(task: Task):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute('''
        UPDATE tasks SET projectId=?, title=?, startDate=?, duration=?, plannedDuration=?, progress=?, status=?, priority=?, ownerId=?, personaId=?, dependencyIds=?, tags=?
        WHERE id=?
        ''',(task.projectId,task.title,task.startDate,task.duration,task.plannedDuration,task.progress,task.status,task.priority,task.ownerId,task.personaId,json.dumps(task.dependencyIds),json.dumps(task.tags),task.id))
        conn.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Task not found")
        return task
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.route('/deleteTask')
def deleteTask(task_id):
    conn = sqlite3.connect(DB_PATH)
    cursor = con.cursor()
    try:
        cursor.execute('DELETE FROM tasks WHERE id=?', (task_id,)) 
        conn.commit()
        return {'message': 'Task deleted successfully'}

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=600,detail=str(e))
    finally:
        conn.close()
'''
INPUT EXAMPLE
{
  "task_id": "123",
  "proposals": [
    {
      "field": "priority",
      "current": "low",
      "suggested": "high",
      "reason": "Task is overdue and has dependencies"
    }
  ]
}

'''

# -----------------------------
# Gemini Suggest Endpoint
# -----------------------------
@app.post("/envoy/suggest")
def suggest(req: EnvoyRequest):
    # 1) Fetch a snapshot of tasks from the DB
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    if req.all:
        # get neighbors in project
        cursor.execute(
            "SELECT id, title, status, priority, plannedDuration, dependencyIds FROM tasks WHERE projectId = (SELECT projectId FROM tasks WHERE id = ?)",
            (req.task_id,),
        )
    else:
        cursor.execute(
            "SELECT id, title, status, priority, plannedDuration, dependencyIds FROM tasks WHERE id = ?",
            (req.task_id,),
        )

    rows = cursor.fetchall()
    conn.close()

    tasks_list = []
    for row in rows:
        tasks_list.append({
            "id": row[0],
            "title": row[1],
            "status": row[2],
            "priority": row[3],
            "plannedDuration": row[4],
            "dependencyIds": row[5],
        })

    # 2) Build the prompt we send to Gemini
    prompt_text = f"""
        You are an assistant that suggests structured changes for tasks.
        User context: {req.context_text or 'none'}

        Here are tasks context:
        {tasks_list}

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

    # 3) Call Gemini via the GenAI SDK
    client = genai.Client(api_key=GEMINI_API) 
    model = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt_text
    )
    ai_text = model.text  # get raw text response

    cleaned_text = ai_text.strip()
    if cleaned_text.startswith("```"):
        import re
        cleaned_text = re.sub(r"^```[a-z]*\n", "", cleaned_text, flags=re.MULTILINE)
        cleaned_text = re.sub(r"\n```$", "", cleaned_text, flags=re.MULTILINE)

    try:
        parsed = json.loads(cleaned_text)
    except Exception:
        print(f"JSON Parse Failed. Raw AI Text: {ai_text}")
        return {"error": "Failed to parse Gemini output", "raw": ai_text}

    proposals = []
    if isinstance(parsed, list):
        for p in parsed:
            if isinstance(p, dict):
                unique_id = str(uuid.uuid4())                
                proposals.append({
                    "id": unique_id, 
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

    applied = []
    skipped_immutable = []

    try:
        for p in req.proposals or []:
            field = p.field
            suggested = p.suggested
            # Only allows known safe fields
            if field in AI_MUTABLE_FIELDS or field in AI_OPTIONAL_FIELDS:
                val = json.dumps(suggested) if isinstance(suggested, list) else suggested
                query = f"UPDATE tasks SET {field} = ? WHERE id = ?"
                cursor.execute(query, (val, req.task_id))
                applied.append(field)
            else:
                skipped_immutable.append(field)

        conn.commit()
        return {
            "message": "Task update processed",
            "applied_fields": applied,
            "skipped_fields": skipped_immutable
        }

    except Exception as e:
        conn.rollback()
        return {"error": str(e)}

    finally:
        conn.close()


@app.route('/renderPersona')
def renderPersona():
    pass

if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=SERVER_PORT, reload=True)