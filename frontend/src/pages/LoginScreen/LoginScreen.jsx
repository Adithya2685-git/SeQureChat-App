import { useState,useEffect } from 'react';
import './LoginScreen.css';
import backgroundvideo from '../../assets/loginbackground.mp4'
import { Link,useNavigate } from 'react-router-dom';

function LoginScreen(){
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate= useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    
    // Add your login logic here
    const newUser={
      userid: email,
      pass: password,
    }

    // Simulate API call - you can replace this with actual login logic
    setTimeout(() => {
      setIsLoading(false);
      // TODO: Add actual authentication logic here
    }, 1000);
  };

  const validateForm = () => {
    // TODO: Add form validation logic
    if (!email || !password) {
      setErrorMessage('Please fill in all fields');
      return false;
    }
    setErrorMessage('');
    return true;
  };

  return(
    <>
    <video src={backgroundvideo} autoPlay muted loop className="background-video"></video>
<div className='greetings'>
        
  <h1>Hello There!</h1>
  <h1>Welcome to SeQure Chat</h1>
  <h3>The most secure real-time chat app with Quantum Encryption</h3>
        
<div className='loginbox'>
  <form onSubmit={handleLogin}>
        
  <input 
    type='email' 
    placeholder='Email' 
    value={email} 
    onChange={(e) => setEmail(e.target.value)} 
    disabled={isLoading}
    required 
  />
    <br></br>
  <input 
    type='password' 
    placeholder='password' 
    value={password} 
    onChange={(e) => setPassword(e.target.value)} 
    disabled={isLoading}
    required 
  />
  
  {errorMessage && <div className="error-message">{errorMessage}</div>}

<div className='register-signup'>
    <p>Don't have an account?<Link to="/signup">Register</Link></p>
</div>
<br></br>
<button type="submit" disabled={isLoading} className={isLoading ? 'loading' : ''}>
  {isLoading ? 'Signing in...' : 'Login'}
</button>
          </form>
        </div>
        
      </div> 
    </>
  )
}

export default LoginScreen