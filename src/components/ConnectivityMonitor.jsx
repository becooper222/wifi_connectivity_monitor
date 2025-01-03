import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ConnectivityMonitor = () => {
  const [isOnline, setIsOnline] = useState(window.navigator.onLine);
  const [logs, setLogs] = useState([]);
  const [debugLogs, setDebugLogs] = useState([]);
  const [startTime] = useState(new Date());
  const [uptime, setUptime] = useState('0h 0m 0s');
  const [latencyData, setLatencyData] = useState([]);

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
          
          // Update latency data
          setLatencyData(prev => {
            const now = new Date();
            const newData = [...prev, { time: now.toLocaleTimeString(), latency }];
            return newData.slice(-30); // Keep last 30 data points
          });
          
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

  const clearLatencyData = () => {
    setLatencyData(prev => {
      if (prev.length >= 2) {
        return prev.slice(-2);
      }
      const now = new Date();
      return [{ time: now.toLocaleTimeString(), latency: null }];
    });
  };

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Status Card */}
      <Card className="col-span-4 h-[200px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Status {isOnline ? <Wifi className="text-green-500" /> : <WifiOff className="text-red-500" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold">{isOnline ? 'Connected' : 'Disconnected'}</p>
          <p className="text-sm text-gray-500">Uptime: {uptime}</p>
        </CardContent>
      </Card>

      {/* Latency Monitor */}
      <Card className="col-span-8 h-[200px]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Latency Monitor</CardTitle>
          <button 
            onClick={clearLatencyData}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            title="Clear and restart monitoring"
          >
            <RefreshCw className="h-5 w-5 text-gray-300" />
          </button>
        </CardHeader>
        <CardContent className="h-[130px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={latencyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="latency" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Connection Logs */}
      <Card className="col-span-6 h-[200px]">
        <CardHeader>
          <CardTitle>Connection Logs</CardTitle>
        </CardHeader>
        <CardContent className="h-[130px] overflow-auto">
          <div className="space-y-2">
            {logs.slice(-5).map((log, index) => (
              <div key={index} className="text-sm">
                <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span className="ml-2">{log.status}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Debug Logs */}
      <Card className="col-span-6 h-[200px]">
        <CardHeader>
          <CardTitle>Debug Logs</CardTitle>
        </CardHeader>
        <CardContent className="h-[130px] overflow-auto">
          <div className="space-y-2">
            {debugLogs.map((log, index) => (
              <div key={index} className="text-sm text-gray-600">{log}</div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConnectivityMonitor;