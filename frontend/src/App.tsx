import { useEffect, useState, useCallback, useRef } from 'react'
import './App.css'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

const REGION_COLORS = [
  '#C9A8E8', '#FBBF7C', '#86D48B', '#D0D0D0',
  '#7BB8DD', '#FF8B71', '#D4ED6E', '#FFE57A',
  '#80CBC4', '#CE93D8', '#F48FB1',
];

type CellState = "" | "X" | "XA" | "👑";
type Coord = { r: number; c: number };

// Computes the largest cell size that fits the grid on screen
function useCellSize(size: number) {
  const [cellSize, setCellSize] = useState(52);

  useEffect(() => {
    function compute() {
      // Reserve space for toolbar (~60px), title (~60px), button (~70px), margins (~80px)
      const reservedHeight = 270;
      const reservedWidth = 40;
      const maxH = Math.floor((window.innerHeight - reservedHeight) / size);
      const maxW = Math.floor((window.innerWidth  - reservedWidth)  / size);
      setCellSize(Math.max(28, Math.min(52, maxH, maxW)));
    }
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [size]);

  return cellSize;
}

function App() {
  const [size, setSize] = useState(8);
  const [puzzle, setPuzzle] = useState<any>(null);
  const [userMoves, setUserMoves] = useState<CellState[][]>([]);
  const [gameWon, setGameWon] = useState(false);
  const [autoX, setAutoX] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState(false);
  const [conflicts, setConflicts] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<CellState[][][]>([]);
  const timerRef = useRef<number | null>(null);
  const cellSize = useCellSize(size);

  // ----- FETCH -----
  const fetchPuzzle = useCallback(async (newSize: number) => {
    setPuzzle(null);
    setGameWon(false);
    setSeconds(0);
    setError(false);
    setHistory([]);
    setConflicts(new Set());
    try {
      const res = await fetch(`${API}/api/puzzle?size=${newSize}`);
      if (!res.ok) throw new Error("Bad response");
      const data = await res.json();
      setUserMoves(Array(newSize).fill(null).map(() => Array(newSize).fill("")));
      setPuzzle(data);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => { fetchPuzzle(size); }, [size, fetchPuzzle]);

  // ----- TIMER -----
  useEffect(() => {
    if (puzzle && !gameWon) {
      timerRef.current = window.setInterval(() => setSeconds(s => s + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [puzzle, gameWon]);

  // ----- WIN CHECK -----
  const checkWin = useCallback((moves: CellState[][], puz: any): boolean => {
    const queens: Coord[] = [];
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        if (moves[r][c] === "👑") queens.push({ r, c });
    if (queens.length !== size) return false;
    const rows = new Set<number>(), cols = new Set<number>(), regs = new Set<number>();
    for (const q of queens) {
      if (rows.has(q.r) || cols.has(q.c) || regs.has(puz.regions[q.r][q.c])) return false;
      rows.add(q.r); cols.add(q.c); regs.add(puz.regions[q.r][q.c]);
    }
    for (let i = 0; i < queens.length; i++)
      for (let j = i + 1; j < queens.length; j++)
        if (Math.abs(queens[i].r - queens[j].r) <= 1 && Math.abs(queens[i].c - queens[j].c) <= 1)
          return false;
    return true;
  }, [size]);

  // ----- CONFLICT DETECTION -----
  const computeConflicts = useCallback((moves: CellState[][], puz: any): Set<string> => {
    const queens: (Coord & { region: number })[] = [];
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        if (moves[r][c] === "👑") queens.push({ r, c, region: puz.regions[r][c] });
    const bad = new Set<string>();
    for (let i = 0; i < queens.length; i++) {
      for (let j = i + 1; j < queens.length; j++) {
        const a = queens[i], b = queens[j];
        if (a.r === b.r || a.c === b.c || a.region === b.region ||
           (Math.abs(a.r-b.r) <= 1 && Math.abs(a.c-b.c) <= 1)) {
          bad.add(`${a.r},${a.c}`); bad.add(`${b.r},${b.c}`);
        }
      }
    }
    return bad;
  }, [size]);

  // ----- ACTION HANDLER -----
  const handleAction = useCallback((r: number, c: number, isDrag = false) => {
    if (gameWon || !puzzle || userMoves.length !== size) return;
    const prev = userMoves.map(row => [...row]) as CellState[][];
    const newMoves = userMoves.map(row => [...row]) as CellState[][];
    const current = newMoves[r][c];

    if (isDrag) {
      if (current === "" || current === "XA") newMoves[r][c] = "X";
      else return;
    } else {
      if (current === "" || current === "XA") newMoves[r][c] = "X";
      else if (current === "X") newMoves[r][c] = "👑";
      else newMoves[r][c] = "";
    }

    if (autoX && newMoves[r][c] === "👑") {
      const regId = puzzle.regions[r][c];
      for (let i = 0; i < size; i++)
        for (let j = 0; j < size; j++) {
          if (i === r && j === c) continue;
          if (i === r || j === c || puzzle.regions[i][j] === regId ||
             (Math.abs(i-r) <= 1 && Math.abs(j-c) <= 1))
            if (newMoves[i][j] === "") newMoves[i][j] = "XA";
        }
    }

    if (current === "👑" && newMoves[r][c] !== "👑") {
      const queens = newMoves.flatMap((row, ri) =>
        row.map((cell, ci) => cell === "👑" ? { r: ri, c: ci } : null).filter(Boolean)
      ) as Coord[];
      for (let i = 0; i < size; i++)
        for (let j = 0; j < size; j++) {
          if (newMoves[i][j] !== "XA") continue;
          const still = queens.some(q =>
            q.r === i || q.c === j ||
            puzzle.regions[q.r][q.c] === puzzle.regions[i][j] ||
            (Math.abs(q.r-i) <= 1 && Math.abs(q.c-j) <= 1)
          );
          if (!still) newMoves[i][j] = "";
        }
    }

    setHistory(h => [...h, prev]);
    setUserMoves(newMoves);
    setConflicts(computeConflicts(newMoves, puzzle));
    if (checkWin(newMoves, puzzle)) setGameWon(true);
  }, [gameWon, puzzle, userMoves, size, autoX, checkWin, computeConflicts]);

  // ----- RESET -----
  const handleReset = useCallback(() => {
    setHistory(h => [...h, userMoves]);
    setUserMoves(Array(size).fill(null).map(() => Array(size).fill("")));
    setConflicts(new Set());
    setGameWon(false);
  }, [size, userMoves]);

  // ----- UNDO -----
  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setUserMoves(prev);
    setConflicts(puzzle ? computeConflicts(prev, puzzle) : new Set());
    setGameWon(false);
  }, [history, puzzle, computeConflicts]);

  // ----- BORDERS -----
  const getBorders = useCallback((r: number, c: number) => {
    if (!puzzle) return {};
    const reg = puzzle.regions[r][c];
    const thick = "1px solid #111";
    const thin = "1px solid rgba(0,0,0,0.15)";
    return {
      borderTop:    (r === 0 || puzzle.regions[r-1][c] !== reg) ? thick : thin,
      borderBottom: (r === size-1 || puzzle.regions[r+1][c] !== reg) ? thick : thin,
      borderLeft:   (c === 0 || puzzle.regions[r][c-1] !== reg) ? thick : thin,
      borderRight:  (c === size-1 || puzzle.regions[r][c+1] !== reg) ? thick : thin,
    };
  }, [puzzle, size]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (error) return (
    <div className="loading">
      <span>⚠️ Could not reach server.</span>
      <button className="new-game-btn" style={{ marginTop: 16 }} onClick={() => fetchPuzzle(size)}>Retry</button>
    </div>
  );

  if (!puzzle || userMoves.length !== size)
    return <div className="loading">Gathering Queens for {size}×{size}…</div>;

  // scale: 1.0 at full size (cellSize=52), shrinks proportionally down to ~0.55
  const scale = cellSize / 52;
  const iconSize = Math.max(14, cellSize * 0.55);

  const ui = {
    toolbar: {
      padding: `${Math.round(12 * scale)}px ${Math.round(24 * scale)}px`,
      gap: `${Math.max(12, Math.round(20 * scale))}px`,
      marginBottom: `${Math.round(24 * scale)}px`,
      borderRadius: `${Math.round(14 * scale)}px`,
    },
    select: {
      fontSize: `${Math.round(95 * scale) / 100}rem`,
      padding: `${Math.round(7 * scale)}px ${Math.round(12 * scale)}px`,
    },
    timer: {
      fontSize: `${Math.round(130 * scale) / 100}rem`,
      flex: 1,
      justifyContent: 'center',
    },
    toggleLabel: {
      fontSize: `${Math.round(90 * scale) / 100}rem`,
      gap: `${Math.round(8 * scale)}px`,
    },
    iconBtn: {
      fontSize: `${Math.round(110 * scale) / 100}rem`,
      padding: `${Math.round(5 * scale)}px ${Math.round(10 * scale)}px`,
      borderRadius: `${Math.round(8 * scale)}px`,
    },
    title: {
      fontSize: `${Math.round(260 * scale) / 100}rem`,
      marginBottom: `${Math.round(18 * scale)}px`,
    },
    victory: {
      fontSize: `${Math.round(130 * scale) / 100}rem`,
      marginBottom: `${Math.round(14 * scale)}px`,
    },
    newGameBtn: {
      marginTop: `${Math.round(28 * scale)}px`,
      padding: `${Math.round(13 * scale)}px ${Math.round(36 * scale)}px`,
      fontSize: `${Math.round(100 * scale) / 100}rem`,
      borderRadius: `${Math.round(12 * scale)}px`,
    },
  };

  return (
    <div className="game-container" onMouseUp={() => setIsDragging(false)} onMouseLeave={() => setIsDragging(false)}>
      <div className="toolbar" style={ui.toolbar}>
        <div className="select-wrapper">
          <select value={size} style={ui.select} onChange={e => setSize(parseInt(e.target.value))}>
            {[8, 9, 10, 11].map(n => <option key={n} value={n}>{n}×{n}</option>)}
          </select>
        </div>
        <div className="timer-display" style={ui.timer}>{formatTime(seconds)}</div>
        <label className="toggle-label" style={ui.toggleLabel}>
          <input type="checkbox" checked={autoX} onChange={() => setAutoX(v => !v)} />
          <span>Auto-X</span>
        </label>
        <button className="undo-btn" style={ui.iconBtn} onClick={handleUndo} disabled={history.length === 0} title="Undo">↩</button>
        <button className="undo-btn" style={ui.iconBtn} onClick={handleReset} disabled={userMoves.flat().every(c => c === "")} title="Reset board">⟳</button>
      </div>

      <h1 className="title" style={ui.title}>Queens</h1>

      {gameWon && <div className="victory" style={ui.victory}>✨ Solved in {formatTime(seconds)}! ✨</div>}

      <div className="grid-container">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${size}, ${cellSize}px)` }}>
          {puzzle.regions.map((row: number[], r: number) =>
            row.map((regionId: number, c: number) => {
              const cell = userMoves[r][c];
              const isConflict = conflicts.has(`${r},${c}`);
              const isQueen = cell === "👑";
              return (
                <div
                  key={`${r}-${c}`}
                  className={["cell", isQueen && isConflict ? "cell--conflict" : "", isQueen && !isConflict ? "cell--queen" : ""].join(" ")}
                  style={{ width: cellSize, height: cellSize, backgroundColor: REGION_COLORS[regionId % REGION_COLORS.length], ...getBorders(r, c) }}
                  onMouseDown={() => { setIsDragging(true); handleAction(r, c); }}
                  onMouseEnter={() => isDragging && handleAction(r, c, true)}
                >
                  {isQueen && <span className="queen-icon" style={{ fontSize: iconSize }}>♕</span>}
                  {!isQueen && cell.startsWith("X") && <span className="x-icon" style={{ fontSize: iconSize * 0.7 }}>✕</span>}
                </div>
              );
            })
          )}
        </div>
      </div>

      <button className="new-game-btn" style={ui.newGameBtn} onClick={() => fetchPuzzle(size)}>
        {gameWon ? "Play Again" : "New Game"}
      </button>
    </div>
  );
}

export default App;