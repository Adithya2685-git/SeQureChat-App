import './Chat.css';
import chatbackground from '../../assets/chatbackground.jpg'
function Chat(){

    return(<>
        <img src={chatbackground} className='chat-background'></img>
        <div className='chats-list'>
        <h1>This area will show the users chats list</h1>
        </div>

        <div className='current-chat'>
            <h1>This area will show the current chat with the selected user</h1>
        </div>
    </>)
}

export default Chat