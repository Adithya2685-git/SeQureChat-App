SeQure Chat: A Real-Time Chat Application with Quantum Key Distribution

SeQure Chat is a full-stack, real-time messaging application that uses the E91 quantum key distribution protocol to establish secure, one-time pads for every message. This project demonstrates the practical application of quantum information principles to create a theoretically unbreakable communication channel. The system is designed to not only facilitate secure communication but also to simulate and detect the presence of a quantum eavesdropper, "Eve."

## Core Features

    Real-Time Messaging: A responsive and intuitive chat interface for seamless communication.

    Quantum Key Distribution (QKD): Utilizes the E91 (Ekert) protocol to generate a unique, secret key for every single message. This ensures perfect forward secrecy and resistance to attacks on stored data.

    End-to-End Encryption: Implements a one-time pad XOR cipher using the quantum-generated keys, providing theoretically unbreakable encryption.

    Eavesdropper Simulation: Features a built-in simulation of both a passive listener on the public channel and an active "Quantum Eve" who becomes entangled with the key-sharing state.

    Quantum Bit Error Rate (QBER) Detection: The system automatically performs a sanity check after key generation to detect mismatches caused by eavesdropping. If the QBER exceeds a set threshold, the key is discarded, and the handshake is aborted, alerting the users.

## Technology Stack

This project integrates a modern web stack with a quantum simulation backend.

    Frontend: React.js

        A dynamic and responsive user interface built with modern React hooks (useState, useEffect, useCallback).

        Manages the complex, multi-step QKD handshake state between clients.

        Real-time communication is handled via the native WebSocket API.

    Backend API: FastAPI (Python)

        A high-performance Python framework serving as the main API layer.

        Provides endpoints for user management, chat history, and initiating QKD sessions.

    Quantum Key Generation: Qiskit (Python)

        The core of the security model. A sophisticated Python script uses Qiskit's AerSimulator to simulate the quantum mechanics of the E91 protocol.

        Generates entangled Bell pairs (or GHZ states for eavesdropper simulation) and simulates their measurement by Alice, Bob, and Eve in different bases.

    Database: MongoDB

        A flexible NoSQL database used for storing user accounts and chat histories.

    Public Channel: WebSockets (Python websockets library)

        A lightweight WebSocket server that acts as the public classical communication channel.

        Relays all handshake messages and the final encrypted ciphertext between clients, while also allowing a simulated "Eve" to listen in from the server terminal.

## How It Works: The E91 Protocol Flow

When a user sends a message, the application initiates the following secure handshake:

    Initiation: The sender's client makes a POST request to the FastAPI backend to trigger the Qiskit script, which generates a set of correlated raw keys and bases for both users.

    Key Retrieval: Both sender and receiver independently GET their assigned key data from the API.

    Classical Handshake: The clients use the WebSocket channel to exchange their measurement bases. Each client then independently "sifts" their raw key, keeping only the bits where their basis choice matched the other user's. This produces a shorter, but now identical, secret key.

    Security Verification (QBER Check): A random subset of the sifted key is sacrificed and compared over the public channel.

        If the bits match, the connection is deemed secure. The tested bits are discarded, and the remaining key becomes the one-time pad for the message.

        If the bits do not match (as would happen if the "Quantum Eve" simulation is active), it indicates an eavesdropper. The frontend flags a Mismatch Error, the key is destroyed, and the handshake is aborted.

    Encryption and Transmission: Once the key is verified, the sender encrypts the plaintext message using a byte-wise XOR cipher and sends the Base64-encoded ciphertext over the WebSocket channel.

    Decryption: The receiver uses their identical copy of the key to decrypt the ciphertext, revealing the original message.

This entire process happens seamlessly for every message, guaranteeing that each one is protected by its own unique, quantum-generated key.
