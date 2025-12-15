import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, Card, Typography, Space, Tag, message, Spin } from 'antd';
import { ArrowLeftOutlined, LogoutOutlined, SendOutlined, UserOutlined } from '@ant-design/icons';
import io from 'socket.io-client';

const RoomChat = ({ user, room, onLeaveRoom }) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [roomUsers, setRoomUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      onLeaveRoom();
      return;
    }

    // Initialize socket connection
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
    const newSocket = io(backendUrl, {
      auth: { token: token },
      forceNew: true // Force new connection to avoid conflicts
    });
    setSocket(newSocket);

    // Ensure loading is cleared after connection
    const connectionTimeout = setTimeout(() => {
      console.log('Connection timeout - clearing loading state');
      setLoading(false);
    }, 5000);

    // Connection events
    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server with socket ID:', newSocket.id);
      
      // Join room immediately after connection
      console.log('Joining room after connection:', room._id);
      newSocket.emit('join_room', { roomId: room._id });
      
      // Load existing messages
      console.log('Requesting room messages for:', room._id);
      newSocket.emit('get_room_messages', { roomId: room._id });
    });

    // Reconnect event
    newSocket.on('reconnect', () => {
      console.log('Reconnected to server, rejoining room:', room._id);
      setIsConnected(true);
      newSocket.emit('join_room', { roomId: room._id });
      newSocket.emit('get_room_messages', { roomId: room._id });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      if (error.message.includes('Authentication error')) {
        onLeaveRoom();
      }
    });

    // Debug: Log all socket events
    newSocket.onAny((eventName, ...args) => {
      console.log('Socket event received:', eventName, args);
      if (eventName === 'new_room_message') {
        console.log('NEW ROOM MESSAGE EVENT RECEIVED!', args);
        console.log('Current socket connected:', newSocket.connected);
        console.log('Current socket ID:', newSocket.id);
      }
    });

    // Room events
    newSocket.on('user_joined_room', (data) => {
      setRoomUsers(prev => [...prev, data.user]);
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'system',
        content: `${data.user.username} joined the room`,
        timestamp: new Date()
      }]);
    });

    newSocket.on('user_left_room', (data) => {
      setRoomUsers(prev => prev.filter(u => u.id !== data.user.id));
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'system',
        content: `${data.user.username} left the room`,
        timestamp: new Date()
      }]);
    });

    newSocket.on('room_users', (users) => {
      console.log('Received room users:', users);
      console.log('Number of room users:', users.length);
      setRoomUsers(users);
    });

    newSocket.on('room_messages', (messages) => {
      console.log('Loaded room messages from memory:', messages);
      setMessages(messages);
      setLoading(false);
    });

    // Debug: Log when room is joined
    newSocket.on('user_joined_room', (data) => {
      console.log('User joined room:', data);
      setRoomUsers(prev => {
        // Check if user already exists to avoid duplicates
        const userExists = prev.some(user => user.id === data.user.id);
        if (userExists) {
          console.log('User already in room, skipping duplicate');
          return prev;
        }
        console.log('Adding user to room list:', data.user);
        return [...prev, data.user];
      });
      
      // Add system message for user joining
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'system',
        content: `${data.user.username} joined the room`,
        timestamp: new Date()
      }]);
    });

    newSocket.on('user_left_room', (data) => {
      console.log('User left room:', data);
      setRoomUsers(prev => prev.filter(user => user.id !== data.user.id));
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'system',
        content: `${data.user.username} left the room`,
        timestamp: new Date()
      }]);
    });

    newSocket.on('room_joined', (data) => {
      console.log('Successfully joined room:', data);
      setLoading(false);
    });

    newSocket.on('new_room_message', (message) => {
      console.log('Received room message:', message);
      setMessages(prev => {
        // Check if message already exists to avoid duplicates
        const messageExists = prev.some(msg => 
          msg.id === message.id || 
          (msg.content === message.content && 
           msg.user?.id === message.user?.id && 
           Math.abs(new Date(msg.timestamp) - new Date(message.timestamp)) < 1000)
        );
        
        if (messageExists) {
          console.log('Message already exists, skipping duplicate');
          return prev;
        }
        
        console.log('Adding new message to list:', message);
        return [...prev, message];
      });
    });

    newSocket.on('user_typing_room', (data) => {
      setTypingUsers(prev => {
        if (!prev.find(u => u.id === data.id)) {
          return [...prev, data];
        }
        return prev;
      });
    });

    newSocket.on('user_stopped_typing_room', (data) => {
      setTypingUsers(prev => prev.filter(u => u.id !== data.id));
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      message.error(error.message);
    });

    newSocket.on('room_closed', (data) => {
      console.log('Room closed:', data.message);
      message.warning(data.message);
      onLeaveRoom(); // Navigate back to rooms
    });

    newSocket.on('room_cleared', (data) => {
      console.log('Room cleared:', data.message);
      message.info(data.message);
      // Clear all messages and users from the room
      setMessages([]);
      setRoomUsers([]);
    });

    newSocket.on('test_response', (data) => {
      console.log('Received test response from backend:', data);
    });

    // Room joining and message loading is now handled in the 'connect' event

    // Periodic room status check and rejoin
    const statusInterval = setInterval(() => {
      console.log('Room status check:');
      console.log('- Socket connected:', newSocket.connected);
      console.log('- Socket ID:', newSocket.id);
      console.log('- Room ID:', room._id);
      console.log('- Current messages count:', messages.length);
      console.log('- Current room users count:', roomUsers.length);
      
      // Rejoin room every 30 seconds to ensure we're still in the room
      if (newSocket.connected) {
        console.log('Rejoining room to maintain connection...');
        newSocket.emit('join_room', { roomId: room._id });
      }
    }, 30000);

    // Set loading to false after a short delay to allow room joining
    const loadingTimeout = setTimeout(() => {
      console.log('Loading timeout reached - setting loading to false');
      setLoading(false);
    }, 2000);

    // Fallback: Force load messages after 3 seconds if no messages received
    const fallbackTimeout = setTimeout(() => {
      console.log('Fallback: Manually requesting messages again');
      newSocket.emit('get_room_messages', { roomId: room._id });
    }, 3000);

    // Also set loading to false when we receive any room event
    const clearLoading = () => {
      clearTimeout(loadingTimeout);
      clearTimeout(fallbackTimeout);
      setLoading(false);
    };

    // Clear loading on any room-related event
    newSocket.on('room_users', clearLoading);
    newSocket.on('room_messages', clearLoading);
    newSocket.on('user_joined_room', clearLoading);

    return () => {
      clearTimeout(connectionTimeout);
      clearTimeout(loadingTimeout);
      clearTimeout(fallbackTimeout);
      clearInterval(statusInterval);
      newSocket.emit('leave_room', { roomId: room._id });
      newSocket.close();
    };
  }, [room._id, onLeaveRoom]);


  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !socket) return;

    const messageContent = inputMessage.trim();
    console.log('Sending room message:', {
      roomId: room._id,
      content: messageContent
    });

    // Clear input immediately
    setInputMessage('');

    // Send message to server - it will be added when received back
    socket.emit('send_room_message', {
      roomId: room._id,
      content: messageContent
    });

    // Fallback: If no message received within 3 seconds, request refresh
    setTimeout(() => {
      console.log('Fallback: Requesting message refresh after send');
      socket.emit('get_room_messages', { roomId: room._id });
    }, 3000);
  };

  const handleTyping = () => {
    if (!socket) return;

    socket.emit('room_typing_start', { roomId: room._id });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('room_typing_stop', { roomId: room._id });
    }, 1000);
  };

  const getTopicDisplayName = (topic) => {
    return topic; // Topics are now stored as display names
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-white">
        <div className="flex flex-col items-center justify-center flex-1 text-gray-600">
          <Spin size="large" />
          <Typography.Text className="mt-3">Loading room...</Typography.Text>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 p-4 md:p-6 flex items-center justify-between shadow-sm sticky top-0 z-40">
        <div className="flex-1">
          <Space>
            <Typography.Title level={2} className="!m-0 flex items-center gap-3 text-gray-900">
              {room.name}
              {room.createdBy._id === user.id && <Tag color="orange" className="ml-2">Creator</Tag>}
            </Typography.Title>
          </Space>
          <div className="mt-2">
            <Space>
              <Tag color="blue">{getTopicDisplayName(room.topic)}</Tag>
              <Typography.Text className="text-gray-600">
                <UserOutlined /> {roomUsers.length}/{room.maxParticipants}
              </Typography.Text>
            </Space>
          </div>
        </div>
        
        <Space>
          <div className="flex items-center gap-2 text-sm text-gray-600 mr-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <Typography.Text>{isConnected ? 'Connected' : 'Disconnected'}</Typography.Text>
          </div>
          <Button 
            icon={<ArrowLeftOutlined />}
            onClick={onLeaveRoom} 
            className="text-blue-600 border-blue-500"
          >
            Back to Rooms
          </Button>
          <Button 
            danger
            icon={<LogoutOutlined />}
            onClick={onLeaveRoom} 
          >
            Leave Room
          </Button>
        </Space>
      </div>

      {/* Chat Area */}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 bg-gray-50 flex flex-col gap-4 min-h-0">
          {messages.map((message) => (
            <div key={message.id} className={`flex gap-3 max-w-[70%] ${message.type === 'system' ? 'justify-center max-w-full' : ''}`}>
              {message.type !== 'system' && (
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  <span>
                    {message.user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                {message.type !== 'system' && (
                  <div className="flex items-center gap-2 mb-1">
                    <Typography.Text strong className="text-sm text-gray-900">{message.user.username}</Typography.Text>
                    <Typography.Text className="text-xs text-gray-500">{formatTime(message.timestamp)}</Typography.Text>
                  </div>
                )}
                <div className={`rounded-2xl px-4 py-3 shadow-sm border ${message.type === 'system' ? 'bg-gray-100 text-gray-600 italic text-center' : 'bg-white text-gray-800'} leading-relaxed`}>
                  {message.content}
                </div>
              </div>
            </div>
          ))}
          
          {/* Typing indicators */}
          {typingUsers.length > 0 && (
            <div className="text-center text-sm text-gray-600 italic py-2">
              <Typography.Text>
                {typingUsers.map(u => u.username).join(', ')} 
                {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </Typography.Text>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="bg-white border-t border-gray-100 p-4 md:p-6">
          <Input.Group compact>
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleTyping}
              placeholder="Type a message..."
              className="flex-1"
              disabled={!isConnected}
              onPressEnter={handleSendMessage}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || !isConnected}
              className="rounded-r-md"
            >
              Send
            </Button>
          </Input.Group>
        </div>
      </div>

      {/* Sidebar - Room Users */}
      <Card className="w-full md:w-64 bg-white border-t md:border-l border-gray-100" title={`Online Users (${roomUsers.length})`}>
        <div className="flex flex-col gap-3">
          {roomUsers.map(user => (
            <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                <span>
                  {user.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <Typography.Text className="text-sm text-gray-800 font-medium">{user.username}</Typography.Text>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default RoomChat;
