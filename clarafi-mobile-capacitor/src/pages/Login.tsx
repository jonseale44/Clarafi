import { IonButton, IonContent, IonInput, IonItem, IonLabel, IonPage, IonTitle, IonToolbar, IonHeader, IonLoading, IonToast } from '@ionic/react';
import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import './Login.css';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showLoading, setShowLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const history = useHistory();

  const handleLogin = async () => {
    if (!username || !password) {
      setToastMessage('Please enter both username and password');
      setShowToast(true);
      return;
    }

    setShowLoading(true);
    
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });

      if (response.ok) {
        history.push('/home');
      } else {
        setToastMessage('Invalid username or password');
        setShowToast(true);
      }
    } catch (error) {
      setToastMessage('Login failed. Please try again.');
      setShowToast(true);
    } finally {
      setShowLoading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Login</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="login-container">
          <div className="login-logo">
            <h1>
              <span className="logo-navy">CLAR</span>
              <span className="logo-gold">AFI</span>
            </h1>
            <p>Electronic Medical Records</p>
          </div>
          
          <div className="login-form">
            <IonItem>
              <IonLabel position="floating">Username</IonLabel>
              <IonInput
                type="text"
                value={username}
                onIonChange={e => setUsername(e.detail.value!)}
                required
              ></IonInput>
            </IonItem>
            
            <IonItem>
              <IonLabel position="floating">Password</IonLabel>
              <IonInput
                type="password"
                value={password}
                onIonChange={e => setPassword(e.detail.value!)}
                required
              ></IonInput>
            </IonItem>
            
            <IonButton expand="block" onClick={handleLogin} className="login-button">
              Login
            </IonButton>
          </div>
        </div>
        
        <IonLoading
          isOpen={showLoading}
          message={'Logging in...'}
        />
        
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3000}
          position="top"
          color="danger"
        />
      </IonContent>
    </IonPage>
  );
};

export default Login;