import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginScreen from './pages/LoginScreen/LoginScreen';
import SignupScreen from './pages/SignupScreen/SignupScreen';
import Chat from './pages/chat/Chat';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginScreen />} />
        <Route path="/signup" element={<SignupScreen />} />
        <Route path='/chat' element={<Chat/> } errorElement={<><div>ERROR 404 NOT FOUND</div></>} />
      </Routes>
    </Router>
  );
}

export default App;