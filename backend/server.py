import asyncio
import json
import websockets

# This dictionary will store connected clients, mapping usernames to WebSocket objects.
CLIENTS = {}

async def handler(websocket):
    """
    Handles a single client connection, registers them, and relays messages.
    """
    registered_username = None
    try:
        # The first message from a client must be a 'register' message.
        message = await websocket.recv()
        data = json.loads(message)
        
        if data.get("type") == "register":
            username = data.get("username")
            if username and username not in CLIENTS:
                CLIENTS[username] = websocket
                registered_username = username
                print(f"✅ Client '{username}' registered and connected from {websocket.remote_address}.")
            elif username in CLIENTS:
                print(f"❌ Connection rejected: Username '{username}' is already taken.")
                await websocket.close(1008, "Username already taken")
                return
            else:
                # If registration fails, close the connection.
                print("❌ Connection rejected: No username provided for registration.")
                await websocket.close(1008, "Username required")
                return
        else:
            print(f"❌ Connection rejected: First message was not type 'register'. Got: {data.get('type')}")
            await websocket.close(1002, "Protocol error")
            return

        # Listen for subsequent messages from the now-registered client.
        async for message in websocket:
            try:
                data = json.loads(message)
                msg_type = data.get("type")

                # VVV --- EVE'S VIEW OF THE PUBLIC CHANNEL --- VVV
                if msg_type == 'final_message':
                    ciphertext = data.get('encryptedText', '[empty]')
                    print(f"🕵️‍♀️ EVE intercepts final encrypted message: {ciphertext}")
                # ^^^ --- END OF EVE'S VIEW --- ^^^

                sender = data.get("sender")
                receiver = data.get("receiver")

                if not all([msg_type, sender, receiver]):
                    print(f"⚠️  Message from '{registered_username}' missing required fields (type, sender, receiver).")
                    continue

                if receiver in CLIENTS:
                    # Find the recipient's websocket connection.
                    receiver_ws = CLIENTS[receiver]
                    
                    # Forward the original JSON message to the recipient.
                    await receiver_ws.send(json.dumps(data))
                    print(f"📨 Relayed '{msg_type}' from '{sender}' to '{receiver}'.")
                else:
                    print(f"⚠️ Could not relay message from '{sender}': Receiver '{receiver}' not found or not connected.")
            
            except json.JSONDecodeError:
                print(f"❌ Received invalid JSON from '{registered_username}'.")
            except Exception as e:
                print(f"An error occurred while handling message from '{registered_username}': {e}")

    except websockets.exceptions.ConnectionClosed as e:
        print(f"Connection from {registered_username or 'unregistered client'} closed: {e.code} {e.reason}")
    finally:
        # When the connection is closed, unregister the client.
        if registered_username and registered_username in CLIENTS:
            del CLIENTS[registered_username]
            print(f"⭕ Client '{registered_username}' disconnected and unregistered.")

async def main():
    # Start the WebSocket server on localhost port 5050.
    async with websockets.serve(handler, "localhost", 5050):
        print("🚀 WebSocket server started on ws://localhost:5050")
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    asyncio.run(main())