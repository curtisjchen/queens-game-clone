import random
import threading
import queue
import time

DIRECTIONS = [(0, 1), (0, -1), (1, 0), (-1, 0)]

# --- STAR PLACEMENT ---

def is_safe(board, row, col, n):
    for i in range(n):
        if board[row][i] == 1 or board[i][col] == 1:
            return False
    for r in range(row - 1, row + 2):
        for c in range(col - 1, col + 2):
            if 0 <= r < n and 0 <= c < n and board[r][c] == 1:
                return False
    return True

def solve_stars(board, col, n):
    if col >= n:
        return True
    rows = list(range(n))
    random.shuffle(rows)
    for row in rows:
        if is_safe(board, row, col, n):
            board[row][col] = 1
            if solve_stars(board, col + 1, n):
                return True
            board[row][col] = 0
    return False

# --- REGION GENERATION ---

def generate_regions(n, star_positions):
    """
    Frontier flood-fill growing outward from each star in round-robin order.
    Each cell is always added adjacent to its region, so every region is
    guaranteed to be a single connected blob — no islands, no splits.
    """
    regions = [[-1] * n for _ in range(n)]
    frontiers = [set() for _ in range(n)]

    for i, (r, c) in enumerate(star_positions):
        regions[r][c] = i
        for dr, dc in DIRECTIONS:
            nr, nc = r + dr, c + dc
            if 0 <= nr < n and 0 <= nc < n:
                frontiers[i].add((nr, nc))

    region_ids = list(range(n))
    remaining = n * n - n

    while remaining > 0:
        random.shuffle(region_ids)
        grew = False

        for rid in region_ids:
            frontiers[rid] = {(r, c) for r, c in frontiers[rid] if regions[r][c] == -1}
            if not frontiers[rid]:
                continue

            r, c = random.choice(list(frontiers[rid]))
            regions[r][c] = rid
            frontiers[rid].discard((r, c))
            remaining -= 1

            for dr, dc in DIRECTIONS:
                nr, nc = r + dr, c + dc
                if 0 <= nr < n and 0 <= nc < n and regions[nr][nc] == -1:
                    frontiers[rid].add((nr, nc))

            grew = True

        if not grew:
            # Rescue any stranded cells (rare edge case)
            for r in range(n):
                for c in range(n):
                    if regions[r][c] == -1:
                        for dr, dc in DIRECTIONS:
                            nr, nc = r + dr, c + dc
                            if 0 <= nr < n and 0 <= nc < n and regions[nr][nc] != -1:
                                regions[r][c] = regions[nr][nc]
                                remaining -= 1
                                break
            break

    return regions

# --- PUZZLE GENERATION ---

def generate_one_puzzle(n):
    for _ in range(20):
        board = [[0] * n for _ in range(n)]
        if solve_stars(board, 0, n):
            stars = [(r, c) for r in range(n) for c in range(n) if board[r][c] == 1]
            regions = generate_regions(n, stars)
            return {"regions": regions, "stars": stars, "size": n}
    # Fallback (should never be needed)
    board = [[0] * n for _ in range(n)]
    solve_stars(board, 0, n)
    stars = [(r, c) for r in range(n) for c in range(n) if board[r][c] == 1]
    return {"regions": generate_regions(n, stars), "stars": stars, "size": n}

# --- BACKGROUND QUEUE ---

puzzle_store = {size: queue.Queue(maxsize=5) for size in range(8, 12)}

def puzzle_worker():
    while True:
        for size in range(8, 12):
            while not puzzle_store[size].full():
                try:
                    puzzle_store[size].put(generate_one_puzzle(size))
                except Exception as e:
                    print(f"[worker] Error for n={size}: {e}")
        time.sleep(0.01)

threading.Thread(target=puzzle_worker, daemon=True).start()

def get_queued_puzzle(n):
    try:
        return puzzle_store[n].get_nowait()
    except queue.Empty:
        return generate_one_puzzle(n)