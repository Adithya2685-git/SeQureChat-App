import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Chat.css';
import chatbackground from '../../assets/chatbackground.jpg';

function Chat() {
    const [chats, setChats] = useState([]); 
    const [currentChat, setCurrentChat] = useState(null);
    const [username, setUsername] = useState(''); 
    const [searchuser, setSearchUser] = useState('');
    const [searchResults, setSearchResults] = useState([]); 
    const [isSearching, setIsSearching] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [socket, setSocket] = useState(null); 
    const [messages, setMessages] = useState({}); 
    const navigate = useNavigate();

    useEffect(() => {
        
        const storedUsername = localStorage.getItem('username');
        if (!storedUsername) {
            alert('You must be logged in to access the chat!');
            navigate('/'); 
            return;
        }

        setUsername(storedUsername); // Set the username in state

        // Initialize WebSocket connection
        const ws = new WebSocket('ws://localhost:8001'); // Assuming server.py runs on port 8001
        setSocket(ws);

        ws.onopen = () => {
            console.log('Connected to WebSocket server');
            // Register user with the server
            ws.send(JSON.stringify({
                type: 'register',
                username: storedUsername
            }));
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleIncomingMessage(data);
        };

        ws.onclose = () => {
            console.log('WebSocket connection closed');
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        // Fetch the user's chats
        const fetchChats = async () => {
            try {
                const res = await fetch(`http://localhost:8000/chats/${storedUsername}`);
                if (res.ok) {
                    const data = await res.json();
                    setChats(data); // Set the fetched chats in state
                    
                    // Initialize messages for each chat
                    const initialMessages = {};
                    data.forEach(chat => {
                        initialMessages[chat.id] = chat.messages || [];
                    });
                    setMessages(initialMessages);
                } else {
                    console.error('Failed to fetch chats');
                }
            } catch (error) {
                console.error('Error fetching chats:', error);
            }
        };

        fetchChats();

        // Cleanup WebSocket on component unmount
        return () => {
            if (ws) {
                ws.close();
            }
        };
    }, [navigate]);

    const xorEncryptDecrypt= (message, key)=> {
        let result = '';
        for (let i = 0; i < message.length; i++) {
        // Get the character code of the message character
        const messageCharCode = message.charCodeAt(i);

        // Get the character code of the key character (repeating the key if necessary)
        const keyCharCode = key.charCodeAt(i % key.length);

        // Perform the XOR operation and convert the result back to a character
        const xorChar = String.fromCharCode(messageCharCode ^ keyCharCode);
    
        result += xorChar;
    }
    return result;
    }
    // Handle incoming messages from WebSocket
    const handleIncomingMessage = (data) => {
        if (data.type === 'message') {
            const decryptedMessage = decryptMessage(data.encryptedMessage, data.chatId);
            
            setMessages(prevMessages => ({
                ...prevMessages,
                [data.chatId]: [
                    ...(prevMessages[data.chatId] || []),
                    {
                        sender: data.sender,
                        text: decryptedMessage,
                        timestamp: new Date().toISOString()
                    }
                ]
            }));
        }
    };

    // Placeholder function for key distribution - you'll implement this
    const distributeQuantumKeys = async (sender, receiver) => {
        try {
          
            const res = await fetch('http://localhost:8000/qkd', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sender: "alice",
                    receiver: "bob"
                })
            });

            if (res.ok) {
                const status= await res.json();
                console.log('Quantum keys distributed successfully:', status);
                const response = await fetch(`http://localhost:8000/qkd/${sender}`,{
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username: sender
                    })
                });
                if(response.ok){
                    const sender_qkey_data= await response.json();
                    return sender_qkey_data;
                }
                else{
                    console.error('Failed to fetch keys');
                    return null;
                }
            } else {
                console.error('Failed to distribute quantum keys');
                return null;
            }
        } catch (error) {
            console.error('Error distributing quantum keys:', error);
            return null;
        }
    };

    const filter_keys_by_basis= (key,basis) =>{

    }
    const test_subset = (key, basis)=> {

    }

    const encryptMessage = (message, sender, receiver) => {
        // TODO: Implement quantum encryption
        console.log(`Encrypting message for chat ${chatId}:`, message);
        const key_data= distributeQuantumKeys()
        const basis = key_data.basis;
        const key= key_data.key;
        const filtered_data= filter_keys_by_basis(key,basis);
        basis= filtered_data.basis;
        key= test_subset(key, basis);
        const encrypted_message= xorEncryptDecrypt(message, key);
        
        return encrypted_message; // Placeholder - return encrypted message
    };

    // Placeholder function for message decryption - you'll implement this
    const decryptMessage = (encryptedMessage, chatId) => {
        // TODO: Implement quantum decryption
        console.log(`Decrypting message for chat ${chatId}:`, encryptedMessage);
        return encryptedMessage; // Placeholder - return decrypted message
    };

    // Send message function
    const sendMessage = async () => {
        if (!newMessage.trim() || !currentChat || !socket) return;

        try {
            // Encrypt the message before sending
            const encryptedMessage = await encryptMessage(newMessage, sender, receiver);

            // Send message through WebSocket to server.py
            const messageData = {
                type: 'message',
                chatId: currentChat.id,
                sender: username,
                encryptedMessage: encryptedMessage,
                recipients: currentChat.participants.filter(p => p !== username)
            };

            socket.send(JSON.stringify(messageData));

            // Add message to local state (for sender)
            setMessages(prevMessages => ({
                ...prevMessages,
                [currentChat.id]: [
                    ...(prevMessages[currentChat.id] || []),
                    {
                        sender: username,
                        text: newMessage,
                        timestamp: new Date().toISOString()
                    }
                ]
            }));

            setNewMessage(''); // Clear input
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    // Handle Enter key press for sending messages
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Logout function
    const handleLogout = () => {
        if (socket) {
            socket.close();
        }
        localStorage.removeItem('username'); // Clear the username from localStorage
        navigate('/'); // Redirect to the login screen
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
                // Filter out the current user from search results
                const filteredResults = data.filter(user => user.username !== username);
                setSearchResults(filteredResults);
            } else {
                console.error('Failed to search users');
                setSearchResults([]);
            }
        } catch (error) {
            console.error('Error finding users:', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const startChat = async (targetUser) => {
        try {
            const res = await fetch('http://localhost:8000/chats/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    participants: [username, targetUser]
                })
            });

            if (res.ok) {
                const newChat = await res.json();
                setChats(prevChats => [...prevChats, newChat]);
                setCurrentChat(newChat);
                setMessages(prevMessages => ({
                    ...prevMessages,
                    [newChat.id]: []
                }));
                

                setSearchuser('');
                setSearchResults([]);
            } else {
                console.error('Failed to create chat');
            }
        } catch (error) {
            console.error('Error creating chat:', error);
        }
    };

    // Get chat display name
    const getChatDisplayName = (chat) => {
        if (chat.name) return chat.name;
        // If no name, show other participant's username
        const otherParticipant = chat.participants?.find(p => p !== username);
        return otherParticipant || 'Unknown User';
    };

    return (
        <>
            <img src={chatbackground} className="chat-background" alt="Chat Background" />
            <div className="header">
                <h1>SeQure Chat</h1>
                <div className='header-right'>
                    <p>User: {username}</p>
                    <button onClick={handleLogout} className="logout-button">
                        Logout
                    </button>
                </div>
            </div>
            <div className="chats-list">
                <h1>Your Chats</h1>
                <div className="search-container">
                    <input
                        type='text'
                        placeholder='Find user'
                        value={searchuser}
                        onChange={(e) => {
                            setSearchUser(e.target.value);
                            findusers();
                        }}
                    />
                    {isSearching && <p>Searching...</p>}
                    {searchResults.length > 0 && (
                        <div className="search-results">
                            {searchResults.map((user, index) => (
                                <div 
                                    key={index} 
                                    className="search-result-item"
                                    onClick={() => startChat(user.username)}
                                >
                                    {user.username}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {chats.length > 0 ? (
                    chats.map((chat, index) => (
                        <div
                            key={chat.id || index}
                            className={`chat-item ${currentChat?.id === chat.id ? 'active' : ''}`}
                            onClick={() => setCurrentChat(chat)}
                        >
                            {getChatDisplayName(chat)}
                        </div>
                    ))
                ) : (
                    <p>No chats available</p>
                )}
            </div>

            <div className="current-chat">
                {currentChat ? (
                    <>
                        <div className="chat-header">
                            <h1>Chat with {getChatDisplayName(currentChat)}</h1>
                        </div>
                        <div className="chat-messages">
                            {messages[currentChat.id]?.map((message, index) => (
                                <div 
                                    key={index} 
                                    className={`message ${message.sender === username ? 'sent' : 'received'}`}
                                >
                                    <div className="message-content">
                                        <strong>{message.sender}:</strong> {message.text}
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
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Type your message..."
                                className="message-input"
                            />
                            <button onClick={sendMessage} className="send-button">
                                Send
                            </button>
                        </div>
                    </>
                ) : (
                    <h1>Select a chat to view messages</h1>
                )}
            </div>
        </>
    );
}

export default Chat;