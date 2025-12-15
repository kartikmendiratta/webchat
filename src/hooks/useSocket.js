import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

export const useSocket = (user) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user) return;

    const backendUrl =
      import.meta.env.VITE_BACKEND_URL ||
      import.meta.env.VITE_REACT_APP_BACKEND_URL ||
      'http://localhost:5000';
    const newSocket = io(backendUrl, {
      auth: {
        token: localStorage.getItem('token')
      }
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user]);

  return { socket, isConnected };
};

