import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Chat.css';
import chatbackground from '../../assets/chatbackground.jpg';

const xorEncryptDecrypt = (input, binaryKey) => {
    const inputBytes = new TextEncoder().encode(input);
    const result = new Uint8Array(inputBytes.length);
    
    for (let i = 0; i < inputBytes.length; i++) {
        const keyBit = parseInt(binaryKey[i % binaryKey.length], 10);
        result[i] = inputBytes[i] ^ keyBit;
    }
   
    return new TextDecoder().decode(result);
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
                type: 'qkd_handshake', qkd_status: 1, messageId,
                sender: usernameRef.current, receiver: sender, basis: qkdData.basis
            };

            if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify(responseMessage));
            }
        } catch (error) { console.error(`❌ STATUS 0 Error:`, error); }
    } else if (receiver === usernameRef.current && qkd_status === 1) {
        const handshake = outgoingHandshakes[messageId];
        if (!handshake) {
            console.error(`❌ No handshake data found for messageId: ${messageId}`);
            return;
        }

        try {
            const theirBasis = data.basis;
            const res = await fetch(`http://localhost:8000/qkd/${usernameRef.current}`);
            if (!res.ok) throw new Error(`QKD fetch failed: ${res.status}`);
            const myQkdData = await res.json();

            let siftedKey = [];
            for (let i = 0; i < myQkdData.key.length; i++) {
                if (myQkdData.basis[i] === theirBasis[i]) {
                    siftedKey.push(myQkdData.key[i]);
                }
            }

            if (siftedKey.length <= 1024) throw new Error(`Sifted key too short: ${siftedKey.length} bits`);

            const testSize = Math.floor(siftedKey.length / 4);
            const testIndices = [];
            const testKeyData = [];
            while (testIndices.size < testSize) {
                const currentindex = Math.floor(Math.random() * siftedKey.length);
                testIndices.push(currentindex);
                testKeyData.push(siftedKey[currentindex]);
                siftedKey[currentindex] = -1;
            }

            const remainingKey = siftedKey.filter(bit => bit !== -1).join('');
            const finalKey = remainingKey.substring(0, 1024);

            if (finalKey.length < 1024) throw new Error(`Final key too short: ${finalKey.length} bits`);

            setSecureKeys(prev => ({ ...prev, [currentChat.id]: finalKey }));

            const responseMessage = {
                type: 'qkd_handshake', qkd_status: 2, messageId,
                sender: usernameRef.current, receiver: handshake.receiver,
                basis: myQkdData.basis, testKeyData, testIndices: Array.from(testIndices)
            };

            if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify(responseMessage));
            }
        } catch (error) {
            console.error(`❌ STATUS 1 Error:`, error);
            alert("Key generation failed. Please try sending the message again.");
        }
    } else if (receiver === usernameRef.current && qkd_status === 2) {
        try {
            const theirBasis = data.basis;
            const theirTestKeyData = data.testKeyData;
            const handshake = outgoingHandshakes[messageId];
            const theirIndices = data.testIndices;

            if (!handshake || !handshake.myQkdData) throw new Error("QKD data missing for final key derivation.");

            const myQkdData = handshake.myQkdData;

            let siftedKey = [];
            for (let i = 0; i < myQkdData.key.length; i++) {
                if (myQkdData.basis[i] === theirBasis[i])
                     siftedKey.push(myQkdData.key[i]);
            }

            let verified = true;
            for (let i of theirIndices) {
                if (siftedKey[i] !== theirTestKeyData[i])
                    verified = false;
                siftedKey[i] = -1;
            }
            if(!verified){
                console.error(`Error verifying the basis.`);
            }
            let remainingKey = '';
            for (let i = 0; i < siftedKey.length; i++) {
                if (siftedKey[i] !== -1) remainingKey += siftedKey[i];
            }

            const finalKey = remainingKey.substring(0, 1024);

            const chat = chats.find(c => getOtherParticipant(c) === sender);
            if (chat) {
                setSecureKeys(prev => ({ ...prev, [chat.id]: finalKey }));
            }

            const responseMessage = {
                type: 'qkd_handshake', qkd_status: 3, messageId,
                sender: usernameRef.current, receiver: sender
            };

            if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify(responseMessage));
            }

            setOutgoingHandshakes(prev => {
                const updated = { ...prev };
                delete updated[messageId];
                return updated;
            });
        } catch (error) {
            console.error(`❌ STATUS 2 Error:`, error);
            alert(`Failed to establish secure key with ${sender}: ${error.message}`);
        }
    } else if (receiver === usernameRef.current && qkd_status === 3) {
        const handshake = outgoingHandshakes[messageId];
        const finalKey = secureKeys[currentChat.id];

        if (!handshake || !finalKey) {
            console.error(`❌ Missing data for final message:`);
            return;
        }

        try {
            const encryptedText = xorEncryptDecrypt(handshake.text, finalKey);

            const finalMessage = {
                type: 'final_message', chatId: currentChat.id,
                sender: usernameRef.current, receiver: handshake.receiver,
                encryptedText
            };

            if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify(finalMessage));
            }

            addMessageToUI({
                sender: usernameRef.current, text: handshake.text,
                timestamp: new Date().toISOString()
            }, currentChat.id);

            setOutgoingHandshakes(prev => {
                const updated = { ...prev };
                delete updated[messageId];
                return updated;
            });
        } catch (error) { console.error(`❌ STATUS 3 Error:`, error); }
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
            console.error("Cannot send: Socket not ready or message empty.");
            return;
        }
        
        const receiver = getOtherParticipant(currentChat);
        if (!receiver) return;

        try {
            await fetch('http://localhost:8000/qkd', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sender: username, receiver: receiver })
            });
            
            const messageId = `msg_${Date.now()}`;
            setOutgoingHandshakes(prev => ({
                ...prev,
                [messageId]: { text: newMessage, sender: username, receiver }
            }));

            socket.send(JSON.stringify({
                type: 'qkd_handshake',
                qkd_status: 0,
                messageId,
                sender: username,
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