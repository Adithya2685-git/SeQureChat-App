from fastapi import FastAPI
from Qkey import main as generate_keys
app= FastAPI()


@app.get("/qkd")
def qkd_keygen():
    alice_key, alice_basis, bob_key, bob_basis = generate_keys()
    

    return{

    }







