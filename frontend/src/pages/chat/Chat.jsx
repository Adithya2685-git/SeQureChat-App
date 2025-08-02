import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Chat.css';
import chatbackground from '../../assets/chatbackground.jpg';

const xorEncryptDecrypt = (input, binaryKey) => {
    // Step 1: Convert the input string to a UTF-8 byte array.
    const inputBytes = new TextEncoder().encode(input);

    // Step 2: Convert the binary key string (e.g., "10110010...") into a byte array.
    // This is necessary for a correct byte-wise XOR operation.
    if (binaryKey.length % 8 !== 0) {
        throw new Error('Invalid key length: Key must be a string representing a whole number of bytes (multiple of 8 bits).');
    }
    const keyBytes = new Uint8Array(binaryKey.length / 8);
    for (let i = 0; i < keyBytes.length; i++) {
        const byteString = binaryKey.substring(i * 8, (i + 1) * 8);
        keyBytes[i] = parseInt(byteString, 2);
    }

    // Step 3: Enforce One-Time Pad Security Rule
    // The key must be at least as long as the message. Your app already ensures
    // the key (1024 bits) is as long as the max message (128 chars = 1024 bits),
    // but this check is a critical safeguard.
    if (inputBytes.length > keyBytes.length) {
        const errorMessage = `SECURITY-CRITICAL-ERROR: Message length (${inputBytes.length} bytes) exceeds key length (${keyBytes.length} bytes). Cannot encrypt securely.`;
        console.error(errorMessage);
        throw new Error(errorMessage);
    }

    // Step 4: Perform the byte-wise XOR operation.
    const resultBytes = new Uint8Array(inputBytes.length);
    for (let i = 0; i < inputBytes.length; i++) {
        // XOR each input byte with the corresponding key byte.
        resultBytes[i] = inputBytes[i] ^ keyBytes[i];
    }

    // Step 5: Convert the resulting byte array back to a readable string.
    return new TextDecoder().decode(resultBytes);
};

function Chat() {
    const [username, setUsername] = useState('');
    const usernameRef = useRef('');
    const [socket, setSocket] = useState(null);
    const socketRef = useRef(null);
    const [chats, setChats] = useState([]);
    const [currentChat, setCurrentChat] = useState(null);
    const [messages, setMessages] = useState({});
    const [newMessage, setNewMessage] = useState('');
    const [outgoingHandshakes, setOutgoingHandshakes] = useState({});
    const [secureKeys, setSecureKeys] = useState({});
    const [searchuser, setSearchUser] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    
    const navigate = useNavigate();

    // Memoized helper functions to ensure they have stable references
    const addMessageToUI = useCallback((message, chatId) => {
        setMessages(prev => ({ ...prev, [chatId]: [...(prev[chatId] || []), message] }));
    }, []);

    const getOtherParticipant = useCallback((chat) => {
        if (!chat || !chat.name) {
            return null;
        }
        return chat.name;
    }, []);

    const handleFinalMessage = useCallback((data) => {
        const { sender, encryptedText, chatId } = data;
        const key = secureKeys[chatId]; 

        if (!key) {
            console.error(`No secure key for chat ${chatId}. Message cannot be decrypted.`);
            addMessageToUI({ sender, text: "🔒 [DECRYPTION FAILED: NO KEY]", timestamp: new Date().toISOString() }, chatId);
            return;
        }

        const decryptedText = xorEncryptDecrypt(encryptedText, key);
        addMessageToUI({ sender, text: decryptedText, timestamp: new Date().toISOString() }, chatId);
    }, [secureKeys, addMessageToUI]);

const handleQkdMessage = useCallback(async (data) => {
    const { messageId, qkd_status, sender, receiver } = data;

    console.log(`\n🔐 === QKD HANDSHAKE STATUS ${qkd_status} ===`);
    console.log(`📨 Message ID: ${messageId}`);
    console.log(`👤 Sender: ${sender}`);
    console.log(`🎯 Receiver: ${receiver}`);
    console.log(`🆔 My Username: ${usernameRef.current}`);
    console.log(`✅ Am I the receiver?: ${receiver === usernameRef.current}`);
    console.log(`=======================================\n`);

    // STATUS 0: Initial handshake request received
    if (receiver === usernameRef.current && qkd_status === 0) {
        try {
            const res = await fetch(`http://localhost:8000/qkd/${usernameRef.current}`);
            if (!res.ok) throw new Error(`QKD fetch failed: ${res.status}`);
            const qkdData = await res.json();

            setOutgoingHandshakes(prev => ({
                ...prev,
                [messageId]: {
                    myQkdData: qkdData,
                    originalSender: sender,
                    originalReceiver: usernameRef.current,
                    step: 'received_initial'
                }
            }));

            const responseMessage = {
                type: 'qkd_handshake',
                qkd_status: 1,
                messageId,
                sender: usernameRef.current,
                receiver: sender,
                basis: qkdData.basis
            };

            if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify(responseMessage));
            }
        } catch (error) {
            console.error(`❌ STATUS 0 Error:`, error);
        }
    }

    // STATUS 1: Basis exchange - perform sifting and create test bits
    else if (receiver === usernameRef.current && qkd_status === 1) {
        const handshake = outgoingHandshakes[messageId];
        if (!handshake) {
            console.error(`❌ No handshake data found for messageId: ${messageId}`);
            return;
        }

        try {
        const myQkdData = handshake.myQkdData;
        const theirBasis = data.basis;

        // VVV --- ADD THIS LOG --- VVV
        console.log("SENDER'S DATA:", {
            myKey: myQkdData.key.substring(0, 32) + "...",   // Log first 32 bits
            myBasis: myQkdData.basis.substring(0, 32) + "...", // Log first 32 bits
            theirBasis: theirBasis.substring(0, 32) + "..." // Log first 32 bits
        });
        // ^^^ --- END OF LOG --- ^^^        
            const siftedKey = [];
            for (let i = 0; i < myQkdData.key.length; i++) {
                if (myQkdData.basis[i] === theirBasis[i]) {
                    siftedKey.push(myQkdData.key[i]);
                }
            }

            console.log(`🔑 Sifted key length: ${siftedKey.length}`);
            
            if (siftedKey.length <= 1024) {
                throw new Error(`Sifted key too short: ${siftedKey.length} bits`);
            }

            const testSize = Math.floor(siftedKey.length / 4);
            const testIndicesSet = new Set();
            const testKeyData = [];

            console.log(`Selecting ${testSize} test bits from ${siftedKey.length} sifted bits`);
            
            while (testIndicesSet.size < testSize) {
                const randomIndex = Math.floor(Math.random() * siftedKey.length);
                if (!testIndicesSet.has(randomIndex)) {
                    testIndicesSet.add(randomIndex);
                    testKeyData.push(siftedKey[randomIndex]);
                }
            }

            let remainingKey = '';
            for (let i = 0; i < siftedKey.length; i++) {
                if (!testIndicesSet.has(i)) {
                    remainingKey += siftedKey[i];
                }
            }

            const finalKey = remainingKey.substring(0, 1024);
            if (finalKey.length < 1024) {
                throw new Error(`Final key too short: ${finalKey.length} bits`);
            }

            console.log(`✅ Final key length: ${finalKey.length}`);

            setSecureKeys(prev => ({ ...prev, [currentChat.id]: finalKey }));

            const responseMessage = {
                type: 'qkd_handshake',
                qkd_status: 2,
                messageId,
                sender: usernameRef.current,
                receiver: sender,
                basis: myQkdData.basis,
                testKeyData: testKeyData,
                testIndices: Array.from(testIndicesSet) // Convert Set to Array for JSON
            };

            if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify(responseMessage));
            }
        } catch (error) {
            console.error(`❌ STATUS 1 Error:`, error);
            alert("Key generation failed. Please try sending the message again.");
        }
    }

    // STATUS 2: Verify test bits and establish final key
    else if (receiver === usernameRef.current && qkd_status === 2) {
        try {
            const theirBasis = data.basis;
            const theirTestKeyData = data.testKeyData;
            const theirTestIndices = data.testIndices;
            const handshake = outgoingHandshakes[messageId];

            if (!handshake || !handshake.myQkdData) {
                throw new Error("QKD data missing for final key derivation.");
            }

            const myQkdData = handshake.myQkdData;

            // VVV --- ADD THIS LOG --- VVV
            console.log("RECEIVER'S DATA:", {
                myKey: myQkdData.key.substring(0, 32) + "...",   // Log first 32 bits
                myBasis: myQkdData.basis.substring(0, 32) + "...", // Log first 32 bits
                theirBasis: theirBasis.substring(0, 32) + "..." // Log first 32 bits
            });
            // ^^^ --- END OF LOG --- ^^^
            
            // Step 1: Recreate the same sifted key
            const siftedKey = [];
            for (let i = 0; i < myQkdData.key.length; i++) {
                if (myQkdData.basis[i] === theirBasis[i]) {
                    siftedKey.push(myQkdData.key[i]);
                }
            }

            console.log(`🔍 Verification Debug:`);
            console.log(`My sifted key length: ${siftedKey.length}`);
            console.log(`Their test indices count: ${theirTestIndices.length}`);
            console.log(`Their test data length: ${theirTestKeyData.length}`);

            // Step 2: Verify test bits
            let verified = true;
            for (let j = 0; j < theirTestIndices.length; j++) {
                const testIndex = theirTestIndices[j];
                const myTestBit = siftedKey[testIndex];
                const theirTestBit = theirTestKeyData[j];
                
                if (myTestBit !== theirTestBit) {
                    console.error(`❌ Mismatch at test index ${testIndex}: my=${myTestBit}, theirs=${theirTestBit}`);
                    verified = false;
                    break; // Early exit on first mismatch
                }
            }

            if (!verified) {
                console.error(`❌ Basis verification failed - potential eavesdropping detected`);
                throw new Error("Basis verification failed - potential eavesdropping detected");
            }

            console.log(`✅ All ${theirTestIndices.length} test bits verified successfully`);

            // Step 3: Create final key by excluding test indices using Set for O(1) lookup
            const testIndexSet = new Set(theirTestIndices);
            let remainingKey = '';
            for (let i = 0; i < siftedKey.length; i++) {
                if (!testIndexSet.has(i)) {  // O(1) lookup
                    remainingKey += siftedKey[i];
                }
            }

            const finalKey = remainingKey.substring(0, 1024);
            console.log(`✅ Final key derived, length: ${finalKey.length}`);

            // Find the correct chat and store the key
            const chat = chats.find(c => getOtherParticipant(c) === sender);
            if (chat) {
                setSecureKeys(prev => ({ ...prev, [chat.id]: finalKey }));
                console.log(`🔐 Secure key established for chat ${chat.id} with ${sender}`);
            } else {
                console.error(`❌ Could not find chat with ${sender}`);
            }

            // Send final confirmation
            const responseMessage = {
                type: 'qkd_handshake',
                qkd_status: 3,
                messageId,
                sender: usernameRef.current,
                receiver: sender
            };

            if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify(responseMessage));
            }

            // Clean up handshake data
            setOutgoingHandshakes(prev => {
                const updated = { ...prev };
                delete updated[messageId];
                return updated;
            });

        } catch (error) {
            console.error(`❌ STATUS 2 Error:`, error);
            alert(`Failed to establish secure key with ${sender}: ${error.message}`);
        }
    }

    // STATUS 3: Send the actual encrypted message
    else if (receiver === usernameRef.current && qkd_status === 3) {
        const handshake = outgoingHandshakes[messageId];
        const finalKey = secureKeys[currentChat.id];

        if (!handshake || !finalKey) {
            console.error(`❌ Missing data for final message:`);
            console.error(`Handshake exists: ${!!handshake}`);
            console.error(`Final key exists: ${!!finalKey}`);
            console.error(`Current chat ID: ${currentChat?.id}`);
            return;
        }

        try {
            console.log(`📤 Sending encrypted message using ${finalKey.length}-bit key`);
            
            const encryptedText = xorEncryptDecrypt(handshake.text, finalKey);

            const finalMessage = {
                type: 'final_message',
                chatId: currentChat.id,
                sender: usernameRef.current,
                receiver: handshake.originalReceiver || handshake.receiver,
                encryptedText
            };

            if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify(finalMessage));
            }

            // Add the original message to UI (sender sees their own message)
            addMessageToUI({
                sender: usernameRef.current,
                text: handshake.text,
                timestamp: new Date().toISOString()
            }, currentChat.id);

            console.log(`✅ Message sent and displayed: "${handshake.text}"`);

            // Clean up handshake data
            setOutgoingHandshakes(prev => {
                const updated = { ...prev };
                delete updated[messageId];
                return updated;
            });

        } catch (error) {
            console.error(`❌ STATUS 3 Error:`, error);
            alert(`Failed to send encrypted message: ${error.message}`);
        }
    }

}, [outgoingHandshakes, secureKeys, currentChat, chats, getOtherParticipant, addMessageToUI]);

    // EFFECT 1: Manages the WebSocket connection lifecycle. Runs once.
    useEffect(() => {
        const storedUsername = localStorage.getItem('username');
        if (!storedUsername) {
            alert('You must be logged in to access the chat!');
            navigate('/');
            return;
        }
        setUsername(storedUsername);
        usernameRef.current = storedUsername;
    
        console.log("Attempting to connect to WebSocket server...");
        const ws = new WebSocket('ws://localhost:5050');
        setSocket(ws);
        socketRef.current = ws;
    
        ws.onopen = () => {
            console.log('✅ SUCCESS: WebSocket connection opened.');
            ws.send(JSON.stringify({ type: 'register', username: storedUsername }));
        };
    
        ws.onerror = (error) => {
            console.error('❌ ERROR: WebSocket connection failed.', error);
        };
    
        ws.onclose = () => {
            console.log('🔌 INFO: WebSocket connection closed.');
        };
        
        if(storedUsername) {
            fetchChats(storedUsername);
        }
    
        return () => {
            if (ws) ws.close();
        };
    }, [navigate]);

    // EFFECT 2: Manages the message handler. Re-runs when handlers change.
    useEffect(() => {
        if (!socket) return; // Don't attach listener if socket is not ready
    
        const messageHandler = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                if (data.type === 'qkd_handshake') {
                    handleQkdMessage(data);
                } else if (data.type === 'final_message') {
                    handleFinalMessage(data);
                } else {
                    console.log('🔄 OTHER MESSAGE TYPE:', data.type);
                }
            } catch (error) {
                console.error('❌ MESSAGE PARSE ERROR:', error);
            }
        };
    
        socket.onmessage = messageHandler;
    
        return () => {
            if (socket) socket.onmessage = null;
        };
    }, [socket, handleQkdMessage, handleFinalMessage]);


const initiateSendMessage = async () => {
    if (!newMessage.trim() || !currentChat || !socket || socket.readyState !== WebSocket.OPEN) {
        return;
    }
    
    const receiver = getOtherParticipant(currentChat);
    if (!receiver) return;

    const sender = usernameRef.current;

    try {
        // 1. POST to generate keys
        await fetch('http://localhost:8000/qkd', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sender: sender, receiver: receiver })
        });
        
        // 2. GET your own key data immediately
        const res = await fetch(`http://localhost:8000/qkd/${sender}`);
        if (!res.ok) {
            throw new Error(`Failed to fetch my own QKD key: ${res.status}`);
        }
        const myQkdData = await res.json();

        // 3. Store EVERYTHING in state
        const messageId = `msg_${Date.now()}`;
        setOutgoingHandshakes(prev => ({
            ...prev,
            [messageId]: { 
                text: newMessage, 
                sender: sender, 
                receiver,
                myQkdData: myQkdData 
            }
        }));

        // 4. Send the "heads up" message
        socket.send(JSON.stringify({
            type: 'qkd_handshake',
            qkd_status: 0,
            messageId,
            sender: sender,
            receiver
        }));

        setNewMessage('');

    } catch (error) {
        console.error("Error during message initialization:", error);
        alert("Could not send message. Failed to establish a secure channel.");
    }
};

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            initiateSendMessage();
        }
    };
    
    const handleNewMessageChange = (e) => {
        setNewMessage(e.target.value.slice(0, 128));
    };
    
    const fetchChats = async (user) => {
        try {
            const res = await fetch(`http://localhost:8000/chats/${user}`);
            if (res.ok) {
                const data = await res.json();
                setChats(data);
                const initialMessages = {};
                data.forEach(chat => { initialMessages[chat.id] = chat.messages || []; });
                setMessages(initialMessages);
            }
        } catch (error) { console.error("Failed to fetch chats:", error); }
    };

    const findusers = async () => {
        if (!searchuser.trim()) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const res = await fetch(`http://localhost:8000/users/search?query=${searchuser}`);
            if (res.ok) {
                const data = await res.json();
                setSearchResults(data.filter(user => user.username !== username));
            } else {
                setSearchResults([]);
            }
        } catch (error) {
            console.error('Error finding users:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const startChat = async (targetUsername) => {
        try {
            const res = await fetch('http://localhost:8000/chats/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ participants: [username, targetUsername] })
            });
            if (res.ok) {
                const newChat = await res.json();
                if (!chats.some(chat => chat.id === newChat.id)) {
                    setChats(prev => [...prev, newChat]);
                }
                setCurrentChat(newChat);
                setMessages(prev => ({ ...prev, [newChat.id]: prev[newChat.id] || [] }));
                setSearchUser('');
                setSearchResults([]);
            }
        } catch (error) { console.error('Error creating chat:', error); }
    };

    const handleLogout = () => {
        if (socket) socket.close();
        localStorage.removeItem('username');
        navigate('/');
    };

    const getChatDisplayName = (chat) => chat.name || 'Unknown User';
    
    return (
        <div className="chat-ui-wrapper">
            <img src={chatbackground} className="chat-background" alt="Chat Background" />
            
            <div className="header">
                <h1>SeQure Chat</h1>
                <div className='header-right'>
                    <p>User: <strong>{username}</strong></p>
                    <button onClick={handleLogout} className="logout-button">Logout</button>
                </div>
            </div>

            <div className="main-chat-container">
                <div className="chats-list">
                    <h2>Your Chats</h2>
                    <div className="search-container">
                        <input
                            type='text'
                            placeholder='Find user to start chat'
                            value={searchuser}
                            onChange={(e) => setSearchUser(e.target.value)}
                            onKeyUp={findusers}
                        />
                        {isSearching && <p>Searching...</p>}
                        {searchResults.length > 0 && (
                            <div className="search-results">
                                {searchResults.map((user) => (
                                    <div 
                                        key={user.username} 
                                        className="search-result-item"
                                        onClick={() => startChat(user.username)}
                                    >
                                        {user.username}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {chats.map((chat) => (
                        <div
                            key={chat.id}
                            className={`chat-item ${currentChat?.id === chat.id ? 'active' : ''}`}
                            onClick={() => setCurrentChat(chat)}>
                            {getChatDisplayName(chat)}
                        </div>
                    ))}
                </div>

                <div className="current-chat">
                    {currentChat ? (
                        <>
                            <div className="chat-header">
                                <h3>Chat with {getChatDisplayName(currentChat)}</h3>
                            </div>
                            <div className="chat-messages">
                                {messages[currentChat.id]?.map((message, index) => (
                                    <div key={index} className={`message ${message.sender === username ? 'sent' : 'received'}`}>
                                        <div className="message-content">
                                            {message.sender !== username && <strong>{message.sender}: </strong>}
                                            {message.text}
                                        </div>
                                        <div className="message-timestamp">
                                            {new Date(message.timestamp).toLocaleTimeString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="message-input-container">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={handleNewMessageChange}
                                    onKeyDown={handleKeyPress}
                                    placeholder="Type a secure message..."
                                    className="message-input"
                                    maxLength="128"
                                />
                                <span className="char-counter">{newMessage.length} / 128</span>
                                <button onClick={initiateSendMessage} className="send-button">Send</button>
                            </div>
                        </>
                    ) : (
                        <div className="no-chat-selected">
                            <h2>Select a chat or find a user to start a new conversation</h2>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Chat;