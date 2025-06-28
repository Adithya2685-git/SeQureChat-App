function LoginScreen(){

return(<>
      <div className='greetings'>
        <h1>Hello There!</h1>
        <h1>Welcome to SeQure Chat</h1>
        <div className='loginbox'>

        <input type='text' placeholder='username'/>
        <br></br>
        <input type='text' placeholder='password'/>
        <br></br>
        <button onClick={() => setCount((count) => count + 1)}>
          login
        </button>
                <button onClick={() => setCount((count) => count + 1)}>
          signup
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
      </div>
      </div> 
</>)
}

export default LoginScreen