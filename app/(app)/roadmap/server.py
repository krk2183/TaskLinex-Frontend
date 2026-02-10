from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import uvicorn

app = FastAPI()

# In-memory storage to simulate a database
db = {
    "tasks": {},
    "projects": {},
    "users": {},
    "dependencies": {},
    "personas": {}
}

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
    dependencyIds: List[str]
    tags: List[str]
    userId: Optional[str] = None

class Project(BaseModel):
    id: str
    name: str
    userId: str

class DependencyCreate(BaseModel):
    from_task_id: str
    to_task_id: str
    type: str
    note: Optional[str] = None
    userId: str

class Dependency(BaseModel):
    id: str
    from_task_id: str
    to_task_id: str
    type: str
    note: Optional[str] = None

@app.post("/dependencies", response_model=Dependency)
async def create_dependency(dep: DependencyCreate):
    """
    Creates a dependency between two tasks.
    This resolves the 404 error.
    """
    print(f"Received request to create dependency: {dep}")
    # In a real application, you would save this to a database.
    # Here we'll just simulate it.
    dep_id = f"dep_{len(db['dependencies']) + 1}"
    new_dep = Dependency(id=dep_id, **dep.dict())
    db["dependencies"][dep_id] = new_dep

    # Add the dependency to the task
    to_task_id = dep.to_task_id
    if to_task_id in db["tasks"]:
        if dep.from_task_id not in db["tasks"][to_task_id].dependencyIds:
            db["tasks"][to_task_id].dependencyIds.append(dep.from_task_id)
    
    print(f"Successfully created dependency {dep_id}")
    return new_dep

# --- Stub Endpoints to make the frontend fully functional ---

@app.post("/createTask", response_model=Task)
async def create_task(task: Task):
    db["tasks"][task.id] = task
    return task

@app.post("/updateTask", response_model=Task)
async def update_task(task: Task):
    if task.id not in db["tasks"]:
        raise HTTPException(status_code=404, detail="Task not found")
    db["tasks"][task.id] = task
    return task

@app.post("/deleteTask")
async def delete_task(payload: dict):
    task_id = payload.get('id')
    if task_id and task_id in db["tasks"]:
        del db["tasks"][task_id]
        # Also remove dependencies related to this task
        for dep_id, dep in list(db["dependencies"].items()):
            if dep.from_task_id == task_id or dep.to_task_id == task_id:
                del db["dependencies"][dep_id]
        return {"message": "Task deleted"}
    raise HTTPException(status_code=404, detail="Task not found")

@app.get("/renderTask")
async def render_task():
    return list(db["tasks"].values())

@app.get("/tasks/{task_id}/dependencies")
async def get_task_dependencies(task_id: str):
    blocked_by = [dep for dep in db["dependencies"].values() if dep.to_task_id == task_id]
    blocking = [dep for dep in db["dependencies"].values() if dep.from_task_id == task_id]
    return {"blocked_by": blocked_by, "blocking": blocking}

@app.delete("/dependencies/{dep_id}/{user_id}")
async def delete_dependency(dep_id: str, user_id: str):
    if dep_id in db["dependencies"]:
        del db["dependencies"][dep_id]
        return {"message": "Dependency deleted"}
    raise HTTPException(status_code=404, detail="Dependency not found")

# Add other stub endpoints your frontend might need...
@app.post("/createProject")
async def create_project(project: Project):
    db["projects"][project.id] = project
    return project

@app.post("/deleteProject")
async def delete_project(payload: dict):
    project_id = payload.get('id')
    if project_id and project_id in db["projects"]:
        del db["projects"][project_id]
        # Also delete tasks associated with this project
        for task_id, task in list(db["tasks"].items()):
            if task.projectId == project_id:
                del db["tasks"][task_id]
        return {"message": "Project deleted"}
    raise HTTPException(status_code=404, detail="Project not found")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)