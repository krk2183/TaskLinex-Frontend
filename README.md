# 🎯 TaskLinex
> **☕ Platform designed for your team.**

**TaskLinex** is a focus-first productivity system that eliminates cognitive overload by surfacing only what matters now. By prioritizing team-centric communication, we slash meeting times and reclaim your peak performance.

---

## 🧠 Core Philosophy
> **Clarity before complexity. Execution before organization.**

<img width="1662" height="912" alt="THIS" src="https://github.com/user-attachments/assets/acbf5091-7193-4c2e-9ab8-8988c37a0b24" />

---
TaskLinex is built around the **Pulse**, a central interface designed to answer three questions at a glance:
1. **What am I working on right now?**
2. **How far along am I?**
3. **What should I do next?**

---

## ⚡ Pulse (The Core Interface)
Pulse is the main interaction surface—intentionally minimal and distraction-free.

* **Current Focus:** A glanceable view of your active task with a visual progress indicator (0–100%).
* **Up Next:** The immediate next task with a short rationale explaining *why* it’s next.
* **Minimalist Design:** If it does not help you execute the current task, it does not belong here.

---

## 📂 Structure
Each page is designed to specialize in one responsibility only.

| Page | Status | Responsibility |
| :--- | :--- | :--- |
| **Pulse (Home)** | ✅ Complete | Execution-focused overview and active task management. |
| **Dashboard** | ✅ Complete | Broader task and project overview. |
| **Roadmap** | ✅ Complete | Broader task and project overview. |
| **Analytics** | ✅ Complete | Performance insights and progress patterns (no vanity metrics). |
| **Settings** | ✅ Complete | User Account and Envoy Settings customization . |

---

## 🛠️ Tech Stack
### Features
- Full CRUD Operations<sup>*</sup>
- Secure Payment Processing <sup>To Be Added</sup>

---
<sup>*</sup> Logic handled by private server.

* **Frontend:** [Next.js](https://nextjs.org/) (App Router), React, [Tailwind CSS](https://tailwindcss.com/)
* **State:** Component-driven UI*
* **Backend:** FastAPI with AI-assisted prioritization logic*

---

## ✨ Design Principles
* **Focus > Flexibility:** Fewer decisions, clearer defaults.
* **One Primary Task:** Designed to eliminate context switching.
* **Visual Feedback:** Visual progress indicators over raw data tables.
* **Static First:** Establishing solid foundations before adding adaptive logic.


## 📊 HOW THE FIX WORKS

### Registration Flow Diagram

```
┌─────────────────┐
│ User fills form │
└────────┬────────┘
         │
         ▼
┌────────────────────┐
│ Frontend: signup() │  ← Calls Supabase auth with metadata
└────────┬───────────┘
         │
         ▼
┌──────────────────────┐
│ Supabase: New user   │
│ created in auth.users│
└────────┬─────────────┘
         │
         ▼
┌─────────────────────────┐
│ Trigger: handle_new_user│  ← Inserts into users, personas, tasks
└────────┬────────────────┘
         │
         ├─── Success ────┐
         │                │
         ▼                ▼
   ┌──────────┐    ┌────────────┐
   │ Wait 1.5s│    │(Background)│
   └────┬─────┘    └────────────┘
        │
        ▼
   ┌────────────────────┐
   │ Frontend: GET user │  ← With retry logic (5 attempts)
   └────────┬───────────┘
            │
            ├─── Found ─────┐
            │               │
            ├─── 404 ───────┤
            │               │
            ▼               ▼
      ┌──────────┐    ┌────────────────┐
      │ Success! │    │POST /ensure    │  ← Fallback creation
      └────┬─────┘    │ Manually create│
           │          │ user+persona+  │
           │          │ task if trigger│
           │          │ failed         │
           │          └────────┬───────┘
           │                   │
           └──────┬────────────┘
                  │
                  ▼
           ┌──────────────┐
           │Final verify  │
           │GET user again│
           └──────┬───────┘
                  │
                  ▼
           ┌──────────────┐
           │Redirect to   │
           │  /roadmap    │
           └──────────────┘
```

---


---

## 🚀 Roadmap
- [x] Authentication System
- [x] Add adaptive task prioritization logic
- [x] Expand Analytics with actionable insights
- [ ] Multi Model Envoy system
- [ ] Dependency Ripple 
- [ ] Communication Leakage Analytics
- [ ] Cognitive Load & Burnout Detection

---

## 🚫 Non-Goals
TaskLinex is intentionally opinionated and does **not** aim to:
* Replace Notion or become a document/wiki system.
* Support infinite customization at the cost of clarity.
* Optimize for aesthetic "vanity" dashboards over execution.
=======

---

## 🔧 Local Setup

### 1. Environment Configuration
Create an `.env.local` file in the root directory. 

```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000 # Example
NEXT_PUBLIC_SERVER_PORT=SERVER-PORT
ALGORITHM=ALGORITHM
SECRET_KEY="NOT-IN-USE-YET"
```

## 📦 2. Installation
```bash
npm install
```
Installing Dependencies
```bash
pip install -r requirments.txt
```

## ⚡ 3. Running the Project
```bash
npm run dev
```
The application will be live at: http://localhost:8000
