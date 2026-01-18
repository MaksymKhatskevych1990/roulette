from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import random
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "..", "roulette-frontend")

app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/")
def index():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))


PRIZES_CONFIG = [
    {"label": "100 USDT", "chance": 0.01, "value": 100.0},
    {"label": "50 USDT", "chance": 1.0, "value": 50.0},
    {"label": "20 USDT", "chance": 2.0, "value": 20.0},
    {"label": "10 USDT", "chance": 5.0, "value": 10.0},
    {"label": "5 USDT", "chance": 10.0, "value": 5.0},
    {"label": "2 USDT", "chance": 30.0, "value": 2.0},
    {"label": "1.5 USDT", "chance": 80.0, "value": 1.5},
]

FALLBACK_PRIZE = {"label": "1.5 USDT", "value": 1.5}

# Available symbols for reels
REEL_SYMBOLS = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 10.0, 20.0, 25.0, 50.0]

# Pre-calculated valid decompositions to ensure 100% success for config prizes
FIXED_DECOMPOSITIONS = {
    1.5: [0.5, 0.5, 0.5],
    2.0: [1.0, 0.5, 0.5],
    5.0: [2.0, 2.0, 1.0],
    10.0: [5.0, 2.5, 2.5],
    20.0: [10.0, 5.0, 5.0],
    50.0: [20.0, 20.0, 10.0],
    100.0: [50.0, 25.0, 25.0]
}

def decompose_win(target_value):
    """
    Decompose target_value into 3 parts (v1, v2, v3) such that sum is target_value.
    Parts must be in REEL_SYMBOLS.
    """
    # 1. Check fixed map first for reliability
    if target_value in FIXED_DECOMPOSITIONS:
        return list(FIXED_DECOMPOSITIONS[target_value]) # Return copy

    # 2. Minimum possible sum check
    if target_value < 1.5:
        return [0.5, 0.5, 0.5]

    # 3. Random search for other values
    for _ in range(100):
        v1 = random.choice(REEL_SYMBOLS)
        v2 = random.choice(REEL_SYMBOLS)
        needed = round(target_value - v1 - v2, 2)
        
        if needed in REEL_SYMBOLS:
            return [v1, v2, needed]
            
    # Fallback
    return [0.5, 0.5, 0.5]


@app.post("/spin")
def spin():
    # 1. Determine Total Win
    win_prize = FALLBACK_PRIZE
    for prize in PRIZES_CONFIG:
        if random.random() * 100 < prize["chance"]:
            win_prize = prize
            break
            
    # 2. Decompose into 3 reels
    reels = decompose_win(win_prize["value"])
    
    # Shuffle reels so the big number isn't always first
    random.shuffle(reels)
    
    return {
        "total_label": win_prize["label"],
        "total_value": win_prize["value"],
        "reels": reels
    }
