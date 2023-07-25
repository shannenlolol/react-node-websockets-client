import React, { useEffect, useState } from 'react';
import {
  Navbar,
  NavbarBrand,
  UncontrolledTooltip
} from 'reactstrap';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { DefaultEditor } from 'react-simple-wysiwyg';
import Avatar from 'react-avatar';

import './App.css';

const WS_URL = 'ws://127.0.0.1:8000';

// Function to check if a WebSocket message is a user event
function isUserEvent(message) {
  let evt = JSON.parse(message.data);
  return evt.type === 'userevent';
}

// Function to check if a WebSocket message is a document event
function isDocumentEvent(message) {
  let evt = JSON.parse(message.data);
  return evt.type === 'contentchange';
}

function App() {
  // State to store the username and WebSocket connection status
  const [username, setUsername] = useState('');
  const { sendJsonMessage, readyState } = useWebSocket(WS_URL, {
    onOpen: () => {
      console.log('WebSocket connection established.');
    },
    share: true,
    filter: () => false,
    retryOnError: true,
    shouldReconnect: () => true
  });

  useEffect(() => {
    // Send user event to server when the username is provided and WebSocket connection is open
    if(username && readyState === ReadyState.OPEN) {
      sendJsonMessage({
        username,
        type: 'userevent'
      });
    }
  }, [username, sendJsonMessage, readyState]);

  return (
    <>
      <Navbar color="light" light>
        <NavbarBrand href="/">Real-time document editor</NavbarBrand>
      </Navbar>
      <div className="container-fluid">
        {/* If the user is logged in (username is provided), show the editor section,
            otherwise show the login section */}
        {username ? <EditorSection/>
            : <LoginSection onLogin={setUsername}/> }
      </div>
    </>
  );
}

function LoginSection({ onLogin }) {
  const [username, setUsername] = useState('');
  useWebSocket(WS_URL, {
    share: true,
    filter: () => false
  });

  // Function to handle login and set the username
  function logInUser() {
    if(!username.trim()) {
      return;
    }
    onLogin && onLogin(username);
  }

  return (
    <div className="account">
      <div className="account__wrapper">
        <div className="account__card">
          <div className="account__profile">
            <p className="account__name">Hello, user!</p>
            <p className="account__sub">Join to edit the document</p>
          </div>
          {/* Input field for entering the username */}
          <input name="username" onInput={(e) => setUsername(e.target.value)} className="form-control" />
          {/* Button to log in the user */}
          <button
            type="button"
            onClick={() => logInUser()}
            className="btn btn-primary account__btn">Join</button>
        </div>
      </div>
    </div>
  );
}

function History() {
  console.log('history');
  const { lastJsonMessage } = useWebSocket(WS_URL, {
    share: true,
    filter: isUserEvent
  });
  // Get user activity from the WebSocket message
  const activities = lastJsonMessage?.data.userActivity || [];
  return (
    <ul>
      {/* Display the user activity history */}
      {activities.map((activity, index) => <li key={`activity-${index}`}>{activity}</li>)}
    </ul>
  );
}

function Users() {
  const { lastJsonMessage } = useWebSocket(WS_URL, {
    share: true,
    filter: isUserEvent
  });
  // Get users from the WebSocket message
  const users = Object.values(lastJsonMessage?.data.users || {});
  return users.map(user => (
    <div key={user.username}>
      <span id={user.username} className="userInfo" key={user.username}>
        {/* Display user avatars */}
        <Avatar name={user.username} size={40} round="20px"/>
      </span>
      <UncontrolledTooltip placement="top" target={user.username}>
        {user.username}
      </UncontrolledTooltip>
    </div>
  ));
}

function EditorSection() {
  return (
    <div className="main-content">
      <div className="document-holder">
        <div className="currentusers">
          {/* Display the list of current users */}
          <Users/>
        </div>
        {/* Render the document editor */}
        <Document/>
      </div>
      <div className="history-holder">
        {/* Render the user activity history */}
        <History/>
      </div>
    </div>
  );
}

function Document() {
  const { lastJsonMessage, sendJsonMessage } = useWebSocket(WS_URL, {
    share: true,
    filter: isDocumentEvent
  });

  // Get the editor content from the WebSocket message
  let html = lastJsonMessage?.data.editorContent || '';

  // Function to handle editor content change and send it to the server
  function handleHtmlChange(e) {
    sendJsonMessage({
      type: 'contentchange',
      content: e.target.value
    });
  }

  return (
    // Render the WYSIWYG editor with the current HTML content
    <DefaultEditor value={html} onChange={handleHtmlChange} />
  );
}

export default App;
