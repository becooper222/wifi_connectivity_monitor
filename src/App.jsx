import React from 'react'
import ConnectivityMonitor from './components/ConnectivityMonitor'

function App() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Internet Connectivity Monitor</h1>
        <ConnectivityMonitor />
      </div>
    </div>
  )
}

export default App