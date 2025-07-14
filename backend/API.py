from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from Qkey import main as generate_keys
import asyncio
from urllib.parse import quote_plus
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi

app = FastAPI()

username = "adi"
password = quote_plus("Adithya2685@000")  # Escapes special characters
uri = f"mongodb+srv://{username}:{password}@cluster0.mxvkyjc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

client = MongoClient(uri, server_api=ServerApi('1'))

try:
    client.admin.command('ping')
    print("Pinged your deployment. You successfully connected to MongoDB!")
except Exception as e:
    print(e)

db= client.sequrechat
users= db.userdb

class incoming(BaseModel):
    username: str
    password: str

@app.get("/signup")
async def signup(req: incoming):
    if users.find({"name": req.username}):
        raise HTTPException(status_code=409, detail="Username already exists")
    else:
        users.insert_one({"name": req.username,
                          "password": req.password})
        return {"message":"OK, User created succesfully"}

@app.get("/login")
async def login(req: incoming):
    if users.find({"name": req.username,
                   "password": req.password}):
        return {"message":"OK, Authorization Success"}
    else:
        raise HTTPException(status_code=401, detail="Invalid Username or Password")


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
