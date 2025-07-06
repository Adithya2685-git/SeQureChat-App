import { useState,useEffect } from 'react';
import './SignupScreen.css';
import backgroundvideo from '../assets/loginbackground.mp4'

function SignupScreen(){
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    
    // Add your login logic here
    console.log('Login clicked', { email, password, rememberMe });
    
    // Simulate API call - you can replace this with actual login logic
    setTimeout(() => {
      setIsLoading(false);
      // TODO: Add actual authentication logic here
    }, 1000);
  };

  const handleSignup = () => {
    // Add your signup logic here
    console.log('Signup clicked');
    // TODO: Add navigation to signup page
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    // TODO: Add forgot password logic here
    console.log('Forgot password clicked');
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

<div className='forgot-remember'>
           
  <label>
  <input 
    type='checkbox' 
    checked={rememberMe}
    onChange={(e) => setRememberMe(e.target.checked)}
    disabled={isLoading}
  />Remember me
  </label>

    <a href="#" onClick={handleForgotPassword}>Forgot Password?</a>
</div>

<div className='register-signup'>
    <p>Don't have an account?<a href="#" onClick={handleSignup}>Register</a></p>
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

export default SignupScreen