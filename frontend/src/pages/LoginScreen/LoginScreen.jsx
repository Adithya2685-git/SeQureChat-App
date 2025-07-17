import { useState,useEffect } from 'react';
import './LoginScreen.css';
import backgroundvideo from '../../assets/loginbackground.mp4'
import { Link,useNavigate } from 'react-router-dom';

function LoginScreen(){
  const [userid, setUserid] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate= useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    

    const newUser={
      username: userid,
      password: password,
    }

    try {
      const res = await fetch("http://localhost:8000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(newUser)
      });
      
      if (res.ok) {
        alert("Login successful!");
        localStorage.setItem('username', userid); // Save the username after successful login/signup
        navigate("/chat");
      } else {
        const errorData = await res.json();
        setErrorMessage(errorData.detail || 'Signup failed. Please try again.');
      }
    } catch (error) {
      setErrorMessage('An error occurred. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
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
    type='text' 
    placeholder='Username' 
    value={userid} 
    onChange={(e) => setUserid(e.target.value)} 
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