import React, { useState } from 'react'
import { Router, Route, Switch } from 'wouter'
import LoginScreen from './screens/LoginScreen'
import PatientList from './screens/PatientList'
import VoiceRecording from './screens/VoiceRecording'
import PatientChart from './screens/PatientChart'
import OrderEntry from './screens/OrderEntry'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)

  if (!isAuthenticated) {
    return <LoginScreen onLogin={(user) => {
      setIsAuthenticated(true)
      setUser(user)
    }} />
  }

  return (
    <Router>
      <Switch>
        <Route path="/" component={PatientList} />
        <Route path="/voice" component={VoiceRecording} />
        <Route path="/patient/:id" component={PatientChart} />
        <Route path="/patient/:id/orders" component={OrderEntry} />
      </Switch>
    </Router>
  )
}

export default App