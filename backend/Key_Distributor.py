from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from Qkey import main as generate_keys
import asyncio

app = FastAPI()
qkd_data = {}


class QKDRequest(BaseModel):
    sender: str
    receiver: str

# clear keys after delay
async def clear_qkd_data(delay: int = 10):
    await asyncio.sleep(delay)
    qkd_data.clear()

@app.post("/qkd")
async def generate_qkd_keys(req: QKDRequest):
    alice_key, alice_basis, bob_key, bob_basis = generate_keys()

    # users keys and basis
    qkd_data[req.sender] = {
        "name": req.sender,
        "basis": alice_basis,
        "key": alice_key
    }
    qkd_data[req.receiver] = {
        "name": req.receiver,
        "basis": bob_basis,
        "key": bob_key
    }

    asyncio.create_task(clear_qkd_data(10))

    return {
        "status": "Keys generated",
        "sender": req.sender,
        "receiver": req.receiver
    }

@app.get("/qkd/{username}")
async def get_user_key(username: str):
    if username not in qkd_data:
        raise HTTPException(status_code=404, detail="No key available or expired")
    return qkd_data[username]
