import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const ConnectivityMonitor = () => {
  const [isOnline, setIsOnline] = useState(window.navigator.onLine);
  const [logs, setLogs] = useState([]);
  const [debugLogs, setDebugLogs] = useState([]);
  const [frozenDebugLogs, setFrozenDebugLogs] = useState([]);
  const [startTime, setStartTime] = useState(new Date());
  const [uptime, setUptime] = useState('0h 0m 0s');
  const [latencyData, setLatencyData] = useState([]);
  const [connectionQuality, setConnectionQuality] = useState('good');
  const [jitter, setJitter] = useState(0);
  const [packetLoss, setPacketLoss] = useState(0);
  const [uptimeInterval, setUptimeInterval] = useState(null);
  const [isDebugExpanded, setIsDebugExpanded] = useState(false);
  const WINDOW_SIZE = 30000; // 30 seconds in milliseconds

  const handleDebugExpandToggle = () => {
    if (!isDebugExpanded) {
      setFrozenDebugLogs([...debugLogs]);
    }
    setIsDebugExpanded(!isDebugExpanded);
  };

  const updateDebugLogs = (newLogEntry) => {
    if (!isDebugExpanded) {
      setDebugLogs(prev => [...prev.slice(-4), newLogEntry]);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addLog('Connected');
      updateDebugLogs(`Connection restored - Browser reported online event at ${new Date().toISOString()}`);
      // Only set the start time if it's not already set
      if (!startTime || startTime.getTime() === 0) {
        setStartTime(new Date());
      }
      // Start the uptime counter when connected
      if (!uptimeInterval) {
        const interval = setInterval(() => {
          setUptime(getUptime());
        }, 1000);
        setUptimeInterval(interval);
      }
    };

    const handleOffline = () => {
      if (isOnline) {
        setIsOnline(false);
        addLog('Disconnected');
        updateDebugLogs(`Connection lost - Browser reported offline event at ${new Date().toISOString()}`);
        // Clear the uptime interval when disconnected
        if (uptimeInterval) {
          clearInterval(uptimeInterval);
          setUptimeInterval(null);
        }
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial connection check and timer setup
    if (window.navigator.onLine) {
      handleOnline();
    }

    const intervalId = setInterval(checkConnection, 1000);

    // Measure jitter and packet loss every second
    const qualityCheckId = setInterval(checkStreamingQuality, 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
      clearInterval(qualityCheckId);
      if (uptimeInterval) {
        clearInterval(uptimeInterval);
      }
    };
  }, [isOnline, uptimeInterval, isDebugExpanded]);

  const checkConnection = async () => {
    const endpoints = [
      'https://www.google.com/favicon.ico',
      'https://www.cloudflare.com/favicon.ico',
      'https://www.microsoft.com/favicon.ico'
    ];

    let anyEndpointSucceeded = false;
    const currentTime = Date.now();
    const timeStr = new Date().toLocaleTimeString();

    try {
      const results = await Promise.all(
        endpoints.map(async endpoint => {
          try {
            const startTime = performance.now();
            const response = await fetch(endpoint, { mode: 'no-cors', cache: 'no-store' });
            const endTime = performance.now();
            const latency = Math.round(endTime - startTime);
            anyEndpointSucceeded = true;
            return { endpoint, latency, success: true };
          } catch (error) {
            return { endpoint, latency: null, success: false };
          }
        })
      );

      setLatencyData(prev => {
        // Keep data points from the last 30 seconds
        const cutoffTime = currentTime - WINDOW_SIZE;
        const filteredPrev = prev.filter(point => point.timestamp >= cutoffTime);

        // Add new data points
        const newPoints = results
          .filter(({ success }) => success)
          .map(({ endpoint, latency }) => ({
            time: timeStr,
            latency,
            endpoint,
            timestamp: currentTime
          }));

        // Sort by timestamp to ensure proper line rendering
        return [...filteredPrev, ...newPoints].sort((a, b) => a.timestamp - b.timestamp);
      });

      if (anyEndpointSucceeded && !isOnline) {
        handleOnline();
      } else if (!anyEndpointSucceeded && isOnline) {
        handleOffline();
      }
    } catch (error) {
      console.error('Connection check failed:', error);
    }
  };

  const addLog = (status) => {
    const timestamp = new Date();
    const sessionUptime = status === 'Disconnected' ? getUptime() : null;
    setLogs(prevLogs => [
      {
        timestamp,
        status,
        timeAgo: getTimeAgo(timestamp),
        sessionUptime
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
    setLatencyData([]);
  };

  const checkStreamingQuality = async () => {
    try {
      const measurements = [];
      // Perform 5 quick measurements to calculate jitter
      for (let i = 0; i < 5; i++) {
        const start = performance.now();
        await fetch('https://www.google.com/generate_204', {
          mode: 'no-cors',
          cache: 'no-store'
        });
        const latency = performance.now() - start;
        measurements.push(latency);
        updateDebugLogs(
          `Quality measurement ${i + 1}/5
           - Latency: ${Math.round(latency)}ms
           - Timestamp: ${new Date().toISOString()}`
        );
      }

      // Calculate jitter (variation in latency)
      const jitterValue = calculateJitter(measurements);
      setJitter(jitterValue);

      // Calculate packet loss
      const lossRate = measurements.filter(m => m > 200).length / measurements.length;
      const lossPercentage = Math.round(lossRate * 100);
      setPacketLoss(lossPercentage);

      updateDebugLogs(
        `Quality metrics updated
         - Jitter: ${Math.round(jitterValue)}ms
         - Packet Loss: ${lossPercentage}%
         - Average Latency: ${Math.round(measurements.reduce((a, b) => a + b, 0) / measurements.length)}ms
         - Timestamp: ${new Date().toISOString()}`
      );
    } catch (error) {
      updateDebugLogs(
        `Quality check failed
         - Error: ${error.message}
         - Stack: ${error.stack}
         - Timestamp: ${new Date().toISOString()}`
      );
    }
  };

  const calculateJitter = (measurements) => {
    if (measurements.length < 2) return 0;
    const differences = [];
    for (let i = 1; i < measurements.length; i++) {
      differences.push(Math.abs(measurements[i] - measurements[i-1]));
    }
    return Math.round(differences.reduce((a, b) => a + b, 0) / differences.length);
  };

  return (
    <div className="grid grid-cols-12 gap-4 max-h-screen overflow-y-auto p-4">
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
          <p className={`text-sm ${
            connectionQuality === 'good' ? 'text-green-500' :
            connectionQuality === 'fair' ? 'text-yellow-500' : 'text-red-500'
          }`}>
            Quality: {connectionQuality}
          </p>
          <p className="text-sm">Jitter: {jitter}ms</p>
          <p className="text-sm">Packet Loss: {packetLoss}%</p>
        </CardContent>
      </Card>

      {/* Latency Monitor */}
      <Card className="col-span-8 h-[300px]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Latency Monitor</CardTitle>
          <button 
            onClick={clearLatencyData}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            title="Clear and restart monitoring"
          >
            <RefreshCw className="h-5 w-5 text-gray-300" />
          </button>
        </CardHeader>
        <CardContent className="h-[230px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="time" 
                type="category"
                interval={9}
                minTickGap={5}
                domain={['auto', 'auto']}
                allowDataOverflow={false}
                tickFormatter={(value) => {
                  if (!value) return '';
                  const timeParts = value.split(' ');
                  if (timeParts.length < 2) return value;
                  const [time, period] = timeParts;
                  const [hours, minutes, seconds] = time.split(':');
                  return `${hours}:${minutes}:${seconds} ${period}`;
                }}
                angle={-45}
                textAnchor="end"
                height={50}
              />
              <YAxis 
                domain={[0, 'auto']}
                allowDataOverflow={false}
                label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft', offset: 0 }}
              />
              <Tooltip 
                labelFormatter={(label) => `Time: ${label}`}
                formatter={(value) => [`${value}ms`]}
              />
              <Legend verticalAlign="top" height={36} />
              <Line 
                type="monotone" 
                dataKey="latency"
                name="Google"
                stroke="#4285F4"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                connectNulls
                data={latencyData.filter(d => d.endpoint === 'https://www.google.com/favicon.ico')}
              />
              <Line 
                type="monotone" 
                dataKey="latency"
                name="Cloudflare"
                stroke="#F6821F"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                connectNulls
                data={latencyData.filter(d => d.endpoint === 'https://www.cloudflare.com/favicon.ico')}
              />
              <Line 
                type="monotone" 
                dataKey="latency"
                name="Microsoft"
                stroke="#00A4EF"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                connectNulls
                data={latencyData.filter(d => d.endpoint === 'https://www.microsoft.com/favicon.ico')}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Connection Logs */}
      <Card className="col-span-6 h-[200px]">
        <CardHeader className="pb-2">
          <CardTitle>Connection Logs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[130px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400">
            <div className="space-y-2 p-6 pt-0 flex flex-col-reverse">
              {logs.map((log, index) => (
                <div key={index} className="text-sm flex-shrink-0">
                  <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span className="ml-2">{log.status}</span>
                  {log.sessionUptime && (
                    <span className="ml-2 text-gray-400">Session duration: {log.sessionUptime}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Debug Logs */}
      <Card className={`col-span-6 transition-all duration-300 ease-in-out ${isDebugExpanded ? 'h-[800px]' : 'h-[200px]'}`}>
        <CardHeader className="pb-2 sticky top-0 bg-white z-10">
          <div className="flex justify-between items-center">
            <CardTitle>Debug Logs</CardTitle>
            <button 
              onClick={handleDebugExpandToggle}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-300"
              title={isDebugExpanded ? "Collapse" : "Expand"}
            >
              {isDebugExpanded ? "−" : "+"}
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0 h-full overflow-hidden">
          <div className={`h-[calc(100%-4rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400`}>
            <div className="space-y-3 p-6 pt-0 flex flex-col-reverse">
              {(isDebugExpanded ? frozenDebugLogs : debugLogs).map((log, index) => {
                const [header, ...details] = log.split('\n');
                return (
                  <div key={index} className="text-sm border-l-2 border-gray-200 pl-3 flex-shrink-0">
                    <div className="font-medium text-gray-800">{header.trim()}</div>
                    {details.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {details.map((detail, i) => (
                          <div key={i} className="text-gray-500 font-mono text-xs">
                            {detail.trim()}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConnectivityMonitor;