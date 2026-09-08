# SynapseX - AI Integrated Security & Social Platform

Welcome to SynapseX, a futuristic AI-themed platform featuring quantum-grade security and a social experience. This guide will help you set up and run the project manually on your local machine.

## Prerequisites

Ensure you have the following installed:
- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **Python** (v3.9 or higher)
- **PostgreSQL** (v15 or higher)

---

## 1. Database Setup

1.  **Install PostgreSQL**: If not already installed, download it from [postgresql.org](https://www.postgresql.org/download/).
2.  **Create Database**: Create a database named `synapse_db`.
3.  **Configure `.env`**: In `backend-web/.env`, update the `DATABASE_URL` to match your local credentials:
    ```env
    DATABASE_URL="postgresql://<USER>:<PASSWORD>@localhost:5432/synapse_db"
    ```
4.  **Prisma Migration**: Run the following in the `backend-web` directory:
    ```bash
    npm install
    npx prisma db push
    ```

---

## 2. Backend AI (Python FastAPI)

1.  **Navigate to directory**:
    ```bash
    cd backend-ai
    ```
2.  **Create Virtual Environment** (optional but recommended):
    ```bash
    python -m venv .venv
    source .venv/bin/activate  # Linux/macOS
    # .venv\Scripts\activate   # Windows
    ```
3.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
4.  **Run Server**:
    ```bash
    python main.py
    ```
    *The AI backend will be available at `http://localhost:8000`.*

---

## 3. Backend Web (Node.js Express)

1.  **Navigate to directory**:
    ```bash
    cd backend-web
    ```
2.  **Install Dependencies**: (Already done in step 1.4)
    ```bash
    npm install
    ```
3.  **Run Server**:
    ```bash
    npm run dev
    ```
    *The web backend will be available at `http://localhost:5000`.*

---

## 4. Frontend (React + Vite)

1.  **Navigate to directory**:
    ```bash
    cd frontend
    ```
2.  **Install Dependencies**:
    ```bash
    npm install
    ```
3.  **Run Development Server**:
    ```bash
    npm run dev
    ```
    *The frontend will be available at `http://localhost:5173`.*

---

## Summary of URLs

- **Frontend**: http://localhost:5173
- **Web Backend**: http://localhost:5000
- **AI Backend**: http://localhost:8000
- **Database (PostgreSQL)**: localhost:5432 (or 5433 if using Docker)
# New-React-Website-2.0
