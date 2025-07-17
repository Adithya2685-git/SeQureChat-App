import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Chat.css';
import chatbackground from '../../assets/chatbackground.jpg';


function Chat() {
    const [chats, setChats] = useState([]); // State to store the user's chats
    const [currentChat, setCurrentChat] = useState(null); // State for the selected chat
    const [username, setUsername] = useState(''); // Add state for username
    const navigate = useNavigate();

    useEffect(() => {
        // Check if the user is logged in
        const storedUsername = localStorage.getItem('username');
        if (!storedUsername) {
            alert('You must be logged in to access the chat!');
            navigate('/'); // Redirect to login if not logged in
            return;
        }

        setUsername(storedUsername); // Set the username in state

        // Fetch the user's chats
        const fetchChats = async () => {
            try {
                const res = await fetch(`http://localhost:8000/chats/${storedUsername}`);
                if (res.ok) {
                    const data = await res.json();
                    setChats(data); // Set the fetched chats in state
                } else {
                    console.error('Failed to fetch chats');
                }
            } catch (error) {
                console.error('Error fetching chats:', error);
            }
        };

        fetchChats();
    }, [navigate]);

    // Logout function
    const handleLogout = () => {
        localStorage.removeItem('username'); // Clear the username from localStorage
        navigate('/'); // Redirect to the login screen
    };

    return (
        <>
            <img src={chatbackground} className="chat-background" alt="Chat Background" />
            <div className="header">
                <h1>SeQure Chat</h1>
                <div className='header-right'>
                <p>User:{username}</p>
                <button onClick={handleLogout} className="logout-button">
                    Logout
                </button>
                </div>
            </div>
            <div className="chats-list">
                <h1>Your Chats</h1>
                {chats.length > 0 ? (
                    chats.map((chat, index) => (
                        <div
                            key={index}
                            className="chat-item"
                            onClick={() => setCurrentChat(chat)}
                        >
                            {chat.name} {/* Replace with chat-specific data */}
                        </div>
                    ))
                ) : (
                    <p>No chats available</p>
                )}
            </div>

            <div className="current-chat">
                {currentChat ? (
                    <>
                        <h1>Chat with {currentChat.name}</h1>
                        <div className="chat-messages">
                            {currentChat.messages.map((message, index) => (
                                <div key={index} className="message">
                                    <strong>{message.sender}:</strong> {message.text}
                                </div>
                            ))}
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