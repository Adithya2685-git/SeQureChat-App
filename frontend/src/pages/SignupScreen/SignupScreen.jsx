import { useState } from 'react';
import { Link } from 'react-router-dom';
import './SignupScreen.css';
import backgroundvideo from '../../assets/loginbackground.mp4';
/*

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://adi:Adithya2685@000@cluster0.mxvkyjc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);


*/
function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSignup = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    // TODO: Add your signup logic here

    
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  return (
    <>
      <video src={backgroundvideo} autoPlay muted loop className="background-video"></video>
      <div className='greetings'>
        <h1>Sign Up</h1>
        <h1>Welcome to SeQure Chat</h1>
        <h3>The most secure real-time chat app with Quantum Encryption</h3>
        <div className='loginbox'>
          <form onSubmit={handleSignup}>
            <input
              type='email'
              placeholder='Email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
            <br />
            <input
              type='password'
              placeholder='Password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
            {errorMessage && <div className="error-message">{errorMessage}</div>}

            <div className='register-signup'>
              <p>Have an account? <Link to="/">Login</Link></p>
            </div>
            <br />
            <button type="submit" disabled={isLoading} className={isLoading ? 'loading' : ''}>
              {isLoading ? 'Signing up...' : 'Sign Up'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

export default SignupScreen