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
    "http://192.168.0.113:3000",
    "http://192.168.0.  :3000",
    "https://bushlike-nonvibrating-velma.ngrok-free.dev"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
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
    
    try:
        cursor.execute("ALTER TABLE tasks ADD COLUMN completedAt INTEGER")
    except sqlite3.OperationalError:
        pass

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

class PersonaCreate(BaseModel):
    name: str
    weekly_capacity_hours: float = 40.0
    user_id: str = "default_user"

class PersonaDelete(BaseModel):
    id: str

# To be Implemented 
class DependencyCreate(BaseModel):
    task_id: str
    depends_on_id: str
    type: str = "blocks"


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

class AutoBalanceRequest(BaseModel):
    userId: str

class CompleteTaskRequest(BaseModel):
    taskId: str
    userId: str

class AddMemberRequest(BaseModel):
    userId: str
    username: str


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

    cursor.execute('SELECT * FROM users WHERE username = ?', (user.username,))
    existing_username = cursor.fetchone()
    if existing_username:
        conn.close()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken.")

    hashed_pass = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt())
    user_id = str(uuid.uuid4())

    cursor.execute(
        'INSERT INTO users (id, firstName, lastName, username, email, password, companyName, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        (user_id, user.firstName, user.lastName, user.username, user.email, hashed_pass.decode('utf-8'), user.companyName, user.role)
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

    cursor.execute("SELECT password, id, role, companyName FROM users WHERE email = ?", (form_data.email,))
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
    role = result[2]
    company = result[3]

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

    return {"access_token": token, "token_type": "bearer"}

@app.get('/users/{user_id}')
async def get_user_info(user_id: str):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, firstName, lastName, username, email, role, companyName FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return dict(user)
    finally:
        conn.close()

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

@app.post('/completeTask')
async def complete_task(req: CompleteTaskRequest):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        # 1. Get Task to calculate duration
        cursor.execute("SELECT startDate, created_at FROM tasks WHERE id = ?", (req.taskId,)) # Assuming created_at exists or we use startDate
        # Note: Schema doesn't have created_at explicitly in CREATE, but startDate is there.
        # We will use startDate.
        task = cursor.fetchone()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        start_time = task['startDate'] if task['startDate'] else int(datetime.now().timestamp())
        end_time = int(datetime.now().timestamp())
        duration_seconds = end_time - start_time
        
        # 2. Update Task
        cursor.execute("UPDATE tasks SET status = 'Done', progress = 100, completedAt = ? WHERE id = ?", (end_time, req.taskId))
        
        # 3. Update User Stats
        cursor.execute("SELECT avg_task_completion_time, completed_tasks_count FROM users WHERE id = ?", (req.userId,))
        user = cursor.fetchone()
        if user:
            old_avg = user['avg_task_completion_time'] or 0
            old_count = user['completed_tasks_count'] or 0
            new_count = old_count + 1
            new_avg = ((old_avg * old_count) + duration_seconds) / new_count
            cursor.execute("UPDATE users SET avg_task_completion_time = ?, completed_tasks_count = ? WHERE id = ?", (new_avg, new_count, req.userId))
        
        conn.commit()
        return {"message": "Task completed", "new_avg_time": new_avg}
    except Exception as e:
        conn.rollback()
        print(f"Error completing task: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.post('/completeTask')
async def complete_task(req: CompleteTaskRequest):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        # 1. Get Task to calculate duration
        cursor.execute("SELECT startDate, created_at FROM tasks WHERE id = ?", (req.taskId,)) # Assuming created_at exists or we use startDate
        # Note: Schema doesn't have created_at explicitly in CREATE, but startDate is there.
        # We will use startDate.
        task = cursor.fetchone()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        start_time = task['startDate'] if task['startDate'] else int(datetime.now().timestamp())
        end_time = int(datetime.now().timestamp())
        duration_seconds = end_time - start_time
        
        # 2. Update Task
        cursor.execute("UPDATE tasks SET status = 'Done', progress = 100, completedAt = ? WHERE id = ?", (end_time, req.taskId))
        
        # 3. Update User Stats
        cursor.execute("SELECT avg_task_completion_time, completed_tasks_count FROM users WHERE id = ?", (req.userId,))
        user = cursor.fetchone()
        if user:
            old_avg = user['avg_task_completion_time'] or 0
            old_count = user['completed_tasks_count'] or 0
            new_count = old_count + 1
            new_avg = ((old_avg * old_count) + duration_seconds) / new_count
            cursor.execute("UPDATE users SET avg_task_completion_time = ?, completed_tasks_count = ? WHERE id = ?", (new_avg, new_count, req.userId))
        
        conn.commit()
        return {"message": "Task completed", "new_avg_time": new_avg}
    except Exception as e:
        conn.rollback()
        print(f"Error completing task: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.post('/deleteTask')
async def delete_task(request_data: DeleteRequest): # FastAPI automatically parses the JSON body here
    task_id = request_data.id
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute('DELETE FROM tasks WHERE id=?', (task_id,))

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Task not found")

        conn.commit()
        return {"message": "Task deleted successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
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

@app.post('/team/add_member')
async def add_team_member(req: AddMemberRequest):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        # 1. Verify Requester is Admin
        cursor.execute("SELECT role, companyName FROM users WHERE id = ?", (req.userId,))
        admin = cursor.fetchone()
        
        if not admin:
             raise HTTPException(status_code=404, detail="Requester not found")
             
        if admin['role'] != 'admin':
            raise HTTPException(status_code=403, detail="Only admins can add team members")
            
        if not admin['companyName']:
            raise HTTPException(status_code=400, detail="Admin must belong to a company/organization")

        # 2. Find Target User & Update
        cursor.execute("UPDATE users SET companyName = ? WHERE username = ?", (admin['companyName'], req.username))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="User with this username not found")
            
        conn.commit()
        return {"message": f"User {req.username} added to {admin['companyName']}"}
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

if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=SERVER_PORT, reload=True)
