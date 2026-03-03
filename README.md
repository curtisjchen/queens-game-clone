# Queens

A browser-based puzzle game inspired by LinkedIn's Queens. Place one queen in each row, column, and colored region — no two queens can touch, even diagonally.

![alt text](/example.png "Queens Game App Example")

## Prerequisites

- Python 3.8+
- Node.js 18+

## Setup

### Requirements

```bash
pip install uv
uv sync
```

### Backend

```bash
cd backend
pip install fastapi uvicorn
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

## How to Play

- **Click once** → place an X (mark as empty)
- **Click twice** → place a queen
- **Click three times** → clear the cell
- **Drag** → mark multiple cells as X quickly
- **Auto-X** → automatically marks cells that can't contain a queen when you place one

### Rules

- One queen per row
- One queen per column
- One queen per colored region
- No two queens can be adjacent (including diagonally)
- There can be more than one solution for a puzzle

## Features

- 8×8, 9×9, 10×10, and 11×11 board sizes
- Conflict highlighting
- Undo / Reset
- Timer
- Responsive layout that scales to your screen size