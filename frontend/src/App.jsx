import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginScreen from './pages/LoginScreen/LoginScreen';
import SignupScreen from './pages/SignupScreen/SignupScreen';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/signup" element={<SignupScreen />} />
      </Routes>
    </Router>
  );
}

export default App;