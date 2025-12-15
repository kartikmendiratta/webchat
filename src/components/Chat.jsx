import React, { useState } from 'react';
import { Button, Input, Card, Typography, Space, Tag, Dropdown, Menu, message } from 'antd';
import { VideoCameraOutlined, MoreOutlined, CloseOutlined, SendOutlined, SearchOutlined, UserOutlined, SettingOutlined } from '@ant-design/icons';
import VideoCall from './VideoCall';
import Navbar from './Navbar';
import { useSocket, useRandomChat, useMessages, useVideoCall } from '../hooks';


const Chat = ({ user, onLogout, onShowRooms, onShowProfile }) => {
  const [inputMessage, setInputMessage] = useState('');
  
  // Custom hooks
  const { socket, isConnected } = useSocket(user);
  const {
    currentPartner,
    isSearching,
    selectedTopics,
    showTopicSelector,
    availableTopics,
    startRandomChat,
    handleTopicSelection,
    endRandomChat,
    toggleTopic,
    setShowTopicSelector
  } = useRandomChat(socket, user);
  const {
    messages,
    typingUsers,
    isTyping,
    messagesEndRef,
    handleTyping,
    handleStopTyping,
    clearMessages
  } = useMessages(socket, user, currentPartner);
  const {
    isVideoCallActive,
    startVideoCall,
    endVideoCall
  } = useVideoCall(socket, currentPartner);

  const isInChatSession = Boolean(currentPartner) || isSearching;


  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !socket || !isConnected || !currentPartner) return;

    const messageData = {
      content: inputMessage.trim()
    };

    socket.emit('send_message', messageData);
    setInputMessage('');
    handleStopTyping();
  };

  // Chat actions functions
  const handleClearChat = () => {
    if (window.confirm('Are you sure you want to clear all messages? This action cannot be undone.')) {
      clearMessages();
      message.success('Chat history cleared');
    }
  };

  const handleDownloadChat = () => {
    const chatData = {
      partner: currentPartner?.username,
      messages: messages,
      timestamp: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(chatData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chat-${currentPartner?.username}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    message.success('Chat downloaded successfully');
  };

  const handlePartnerInfo = () => {
    message.info(`Partner: ${currentPartner?.username}\nStatus: Online\nConnected: ${new Date().toLocaleString()}`);
  };

  const handleBlockUser = () => {
    if (window.confirm(`Are you sure you want to block ${currentPartner?.username}? You won't be able to receive messages from them.`)) {
      endRandomChat();
      message.success(`${currentPartner?.username} has been blocked`);
    }
  };

  const chatMenu = (
    <Menu>
      <Menu.Item key="clear" onClick={handleClearChat}>
        Clear Chat History
      </Menu.Item>
      <Menu.Item key="download" onClick={handleDownloadChat}>
        Download Chat
      </Menu.Item>
      <Menu.Item key="info" onClick={handlePartnerInfo}>
        Partner Info
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="block" danger onClick={handleBlockUser}>
        Block User
      </Menu.Item>
    </Menu>
  );


  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navbar */}
      <Navbar 
        user={user}
        isConnected={isConnected}
        onShowRooms={onShowRooms}
        onLogout={onLogout}
        onShowProfile={onShowProfile}
      />

      {/* Main Content */}
      <div className={`flex-1 flex flex-col p-4 bg-gray-50 ${isInChatSession ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {isSearching ? (
          <div className="flex-1 flex items-center justify-center">
            <Card className="text-center max-w-md w-full">
              <div className="p-8 space-y-4">
                <div className="mx-auto mb-4 w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <Typography.Title level={3} className="!mb-2 text-gray-800">Finding a chat partner...</Typography.Title>
                <Typography.Text className="!text-gray-600 block">Please wait while we match you with someone interesting!</Typography.Text>
                <Button 
                  onClick={endRandomChat}
                  className="mt-2"
                >
                  Cancel Search
                </Button>
              </div>
            </Card>
          </div>
        ) : !currentPartner ? (
          <div className="flex-1 flex items-center justify-center">
            <Card className="text-center max-w-3xl w-full">
              <div className="p-8 space-y-6">
                <div className="w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                  <div>💬</div>
                </div>
                <Typography.Title level={2} className="!mb-2 text-gray-800">Welcome to Random Chat!</Typography.Title>
                <Typography.Text className="!text-gray-600 block leading-relaxed">
                  Connect with random people from around the world. Share your interests, 
                  have meaningful conversations, and make new friends!
                </Typography.Text>
                
                <div className="my-6">
                  <Button 
                    onClick={() => setShowTopicSelector(!showTopicSelector)}
                    className="mb-4"
                  >
                    {showTopicSelector ? 'Hide' : 'Select'} Topics of Interest
                  </Button>
                  
                  {showTopicSelector && (
                    <Card className="mt-4 text-left">
                      <Typography.Text strong className="block mb-4 text-gray-800">Choose topics you're interested in:</Typography.Text>
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-2">
                          {availableTopics.map(topic => (
                            <Tag.CheckableTag
                              key={topic}
                              checked={selectedTopics.includes(topic)}
                              onChange={() => toggleTopic(topic)}
                              className="m-0"
                            >
                              {topic}
                            </Tag.CheckableTag>
                          ))}
                        </div>
                      </div>
                      
                      {selectedTopics.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-4">
                          <Typography.Text className="text-sky-800">
                            <strong>Selected topics:</strong> {selectedTopics.join(', ')}
                          </Typography.Text>
                        </div>
                      )}
                      
                      <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mt-4">
                        <Typography.Text className="text-gray-600 italic">
                          You can skip topic selection to chat with anyone randomly.
                        </Typography.Text>
                      </div>
                    </Card>
                  )}
                </div>
                
                <Button 
                  type="primary"
                  size="large"
                  icon={<SearchOutlined />}
                  onClick={startRandomChat}
                  disabled={!isConnected}
                  className="mt-2"
                >
                  Find Random Chat
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          <div className="flex flex-1 gap-4 min-h-0 overflow-hidden">
            {/* Video Call Section */}
            {isVideoCallActive && (
              <div className="flex-1 min-w-0 flex flex-col">
                <Card className="h-full" title={
                  <Space>
                    <VideoCameraOutlined />
                    Video Call with {currentPartner.username}
                  </Space>
                } extra={
                  <Button 
                    type="text"
                    icon={<CloseOutlined />}
                    onClick={endVideoCall}
                    title="Close Video Call"
                  />
                }>
                  <VideoCall 
                    socket={socket}
                    currentPartner={currentPartner}
                    user={user}
                    onEndCall={endVideoCall}
                  />
                </Card>
              </div>
            )}

            {/* Messages Section */}
            <Card className="flex-1 min-w-0 flex flex-col bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="bg-white border-b border-gray-100 p-4 flex items-center justify-between">
                <Space>
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {currentPartner.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col ml-3">
                    <Typography.Text strong className="text-base">{currentPartner.username}</Typography.Text>
                    <Typography.Text type="success" className="text-xs">Online</Typography.Text>
                  </div>
                </Space>
                <Space>
                  <Button 
                    icon={<VideoCameraOutlined />}
                    onClick={startVideoCall}
                    title="Start Video Call"
                  />
                  
                  <Dropdown overlay={chatMenu} trigger={['click']}>
                    <Button 
                      icon={<MoreOutlined />}
                      title="Chat Actions"
                    />
                  </Dropdown>
                  
                  <Button 
                    danger
                    icon={<CloseOutlined />}
                    onClick={endRandomChat}
                    title="End Chat"
                  >
                    End Chat
                  </Button>
                </Space>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col gap-4 min-h-0">
                {messages.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    <div className="text-4xl mb-4">💬</div>
                    <Typography.Text>No messages yet. Start a conversation!</Typography.Text>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.user.id === user.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[300px] px-4 py-3 rounded-2xl ${message.user.id === user.id ? 'bg-blue-500 text-white' : 'bg-white text-gray-800 shadow-sm border border-gray-100'}`}>
                        <div className="text-sm leading-snug">
                          {message.content}
                        </div>
                        <div className={`text-xs mt-1 opacity-70 ${message.user.id === user.id ? 'text-white' : 'text-gray-500'}`}>
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* Typing Indicators */}
                {typingUsers.length > 0 && (
                  <div className="flex justify-start">
                    <div className="bg-white px-4 py-3 rounded-2xl shadow-sm border border-gray-100">
                      <Typography.Text className="text-sm text-gray-600 italic">
                        {typingUsers.map(u => u.username).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                      </Typography.Text>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="bg-white border-t border-gray-100 p-4 flex-shrink-0">
                <Input.Group compact>
                  <Input
                    className="flex-1"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onFocus={handleTyping}
                    onBlur={handleStopTyping}
                    placeholder="Type a message..."
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
            </Card>
          </div>
        )}
      </div>

    </div>
  );
};

export default Chat;