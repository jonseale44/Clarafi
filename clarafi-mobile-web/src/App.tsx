import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LoginScreen from './screens/LoginScreen'
import PatientListScreen from './screens/PatientListScreen'
import VoiceRecordingScreen from './screens/VoiceRecordingScreen'
import PatientChartScreen from './screens/PatientChartScreen'
import OrderEntryScreen from './screens/OrderEntryScreen'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<any>(null)

  return (
    <Router>
      <div className="mobile-container">
        <Routes>
          <Route 
            path="/login" 
            element={
              <LoginScreen 
                onLogin={(userData) => {
                  setUser(userData)
                  setIsAuthenticated(true)
                }}
              />
            } 
          />
          <Route
            path="/patients"
            element={
              isAuthenticated ? <PatientListScreen user={user} /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/voice-recording/:patientId"
            element={
              isAuthenticated ? <VoiceRecordingScreen /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/patient/:patientId"
            element={
              isAuthenticated ? <PatientChartScreen /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/order-entry/:patientId/:encounterId"
            element={
              isAuthenticated ? <OrderEntryScreen /> : <Navigate to="/login" />
            }
          />
          <Route 
            path="/" 
            element={<Navigate to={isAuthenticated ? "/patients" : "/login"} />} 
          />
        </Routes>
      </div>
    </Router>
  )
}

export default App