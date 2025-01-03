import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Wifi, WifiOff } from 'lucide-react';

const ConnectivityMonitor = () => {
  const [isOnline, setIsOnline] = useState(window.navigator.onLine);
  const [logs, setLogs] = useState([]);
  const [debugLogs, setDebugLogs] = useState([]);
  const [startTime] = useState(new Date());
  const [uptime, setUptime] = useState('0h 0m 0s');

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addLog('Connected');
    };

    const handleOffline = () => {
      setIsOnline(false);
      addLog('Disconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial connection check
    checkConnection();

    // Periodic connection check every 30 seconds
    const intervalId = setInterval(checkConnection, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const uptimeInterval = setInterval(() => {
      setUptime(getUptime());
    }, 1000);

    return () => clearInterval(uptimeInterval);
  }, []);

  const checkConnection = async () => {
    const endpoints = [
      'https://www.google.com/favicon.ico',
      'https://www.cloudflare.com/favicon.ico',
      'https://www.microsoft.com/favicon.ico'
    ];

    try {
      for (const endpoint of endpoints) {
        try {
          const startTime = performance.now();
          const response = await fetch(endpoint, {
            mode: 'no-cors',
            cache: 'no-store'
          });
          const endTime = performance.now();
          const latency = Math.round(endTime - startTime);
          
          setDebugLogs(prev => [...prev.slice(-4), `Connected to ${endpoint} (${latency}ms)`]);
          
          if (!isOnline) {
            setIsOnline(true);
            addLog('Connected');
          }
          return;
        } catch (error) {
          setDebugLogs(prev => [...prev.slice(-4), `Failed to connect to ${endpoint}: ${error.message}`]);
        }
      }
      
      if (isOnline) {
        setIsOnline(false);
        addLog('Disconnected');
      }
    } catch (error) {
      console.error('Connection check failed:', error);
      setDebugLogs(prev => [...prev.slice(-4), `Connection check failed: ${error.message}`]);
    }
  };

  const addLog = (status) => {
    const timestamp = new Date();
    setLogs(prevLogs => [
      {
        timestamp,
        status,
        timeAgo: getTimeAgo(timestamp)
      },
      ...prevLogs.slice(0, 49)
    ]);
  };

  const getTimeAgo = (timestamp) => {
    const seconds = Math.floor((new Date() - timestamp) / 1000);
    
    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  const getUptime = () => {
    const uptime = Math.floor((new Date() - startTime) / 1000);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Connection Status</span>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="text-green-500" size={24} />
            ) : (
              <WifiOff className="text-red-500" size={24} />
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between p-4 bg-gray-100 rounded-lg">
            <div>
              <p className="text-sm font-medium">Status</p>
              <p className={`text-lg ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                {isOnline ? 'Connected' : 'Disconnected'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Monitoring Time</p>
              <p className="text-lg">{uptime}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Debug Information</h3>
            <div className="bg-gray-100 p-2 rounded-lg mb-4 text-sm font-mono">
              {debugLogs.map((log, index) => (
                <div key={index} className="text-gray-600">{log}</div>
              ))}
            </div>
            <h3 className="text-lg font-medium mb-2">Connection Log</h3>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className="flex justify-between p-2 border-b last:border-0"
                >
                  <span className={`${
                    log.status === 'Connected' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {log.status}
                  </span>
                  <span className="text-gray-500 text-sm">
                    {new Intl.DateTimeFormat('default', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    }).format(log.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConnectivityMonitor;