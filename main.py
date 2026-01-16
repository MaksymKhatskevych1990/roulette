# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import random

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

PRIZES = [
    {"label": "0.1 USDT"},
    {"label": "0.5 USDT"},
    {"label": "1 USDT"},
    {"label": "50 USDT"},
    {"label": "100 USDT"},
]

@app.post("/spin")
def spin():
    prize = random.choice(PRIZES)
    return prize
