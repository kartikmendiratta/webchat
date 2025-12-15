import React, { useState, useEffect } from 'react';
import { Button, Input, Card, Typography, Space, Tag, Modal, Form, message, Spin, Empty } from 'antd';
import { PlusOutlined, SearchOutlined, UserOutlined, LogoutOutlined, TeamOutlined, ArrowLeftOutlined } from '@ant-design/icons';

const Rooms = ({ user, onLogout, onJoinRoom, onShowChat }) => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [popularTopics, setPopularTopics] = useState([]);

  const getTopicDisplayName = (topic) => {
    return topic; // Now topics are stored as display names
  };

  useEffect(() => {
    fetchRooms();
    fetchPopularTopics();
  }, [selectedTopic, searchQuery]);

  const fetchPopularTopics = async () => {
    try {
      const token = localStorage.getItem('token');
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/rooms/topics/popular`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPopularTopics(data.topics);
      }
    } catch (error) {
      console.error('Error fetching popular topics:', error);
    }
  };

  const fetchRooms = async (page = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      
      if (selectedTopic) params.append('topic', selectedTopic);
      
      const response = await fetch(`${backendUrl}/api/rooms/public?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRooms(data.rooms);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (formData) => {
    try {
      console.log('Creating room with data:', formData);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/rooms/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      console.log('Create room response status:', response.status);

      if (response.ok) {
        const newRoom = await response.json();
        console.log('Room created successfully:', newRoom);
        setRooms(prev => [newRoom, ...prev]);
        setShowCreateForm(false);
        message.success('Room created successfully!');
        // Auto-join the created room
        onJoinRoom(newRoom);
      } else {
        const error = await response.json();
        console.error('Create room error:', error);
        message.error(error.message);
      }
    } catch (error) {
      console.error('Error creating room:', error);
      message.error('Failed to create room');
    }
  };

  const handleJoinRoom = async (roomId) => {
    try {
      console.log('Attempting to join room:', roomId);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Join room response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Join room success:', data);
        onJoinRoom(data.room);
      } else {
        const error = await response.json();
        console.error('Join room error:', error);
        message.error(error.message);
      }
    } catch (error) {
      console.error('Error joining room:', error);
      message.error('Failed to join room');
    }
  };

  const filteredRooms = rooms.filter(room => 
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Space>
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
              <span className="text-white font-semibold text-lg">
                {user.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex flex-col">
              <Typography.Title level={2} className="!m-0 text-gray-900">Chat Rooms</Typography.Title>
              <Typography.Text className="text-gray-600">Join topic-based chat rooms worldwide</Typography.Text>
            </div>
          </Space>
          
          <Space>
            <Button 
              icon={<ArrowLeftOutlined />}
              onClick={onShowChat}
              className="text-blue-600 border-blue-500"
            >
              Back to Chat
            </Button>
            <Button 
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowCreateForm(true)}
            >
              Create Room
            </Button>
            <Button 
              icon={<LogoutOutlined />}
              onClick={onLogout}
            >
              Logout
            </Button>
          </Space>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row gap-3 items-center">
        <Input
          placeholder="Search rooms..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          prefix={<SearchOutlined />}
          className="w-full md:max-w-md"
        />
        
        <Input
          placeholder="Filter by topic..."
          value={selectedTopic}
          onChange={(e) => setSelectedTopic(e.target.value)}
          className="w-full md:w-64"
          list="topic-suggestions"
        />
        <datalist id="topic-suggestions">
          {popularTopics.map(topic => (
            <option key={topic} value={topic} />
          ))}
        </datalist>
      </div>

      {/* Rooms List */}
      <div className="max-w-6xl mx-auto px-4 pb-6 flex-1 w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-600">
            <Spin size="large" />
            <Typography.Text className="mt-3">Loading rooms...</Typography.Text>
          </div>
        ) : filteredRooms.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <Typography.Title level={4} className="!mb-1">No rooms found</Typography.Title>
                <Typography.Text>Create a new room or try a different search</Typography.Text>
              </div>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredRooms.map(room => (
              <Card key={room._id} className="hover:-translate-y-0.5 transition shadow-sm" hoverable>
                <div className="flex justify-between items-start mb-3">
                  <Typography.Title level={4} className="!m-0 text-gray-900">{room.name}</Typography.Title>
                  <Tag color="blue" className="ml-2">{getTopicDisplayName(room.topic)}</Tag>
                </div>
                
                <Typography.Text className="text-gray-600 block mb-4 leading-relaxed">{room.description || 'No description'}</Typography.Text>
                
                <div className="text-sm text-gray-600 mb-4">
                  <Space>
                    <Typography.Text className="font-medium">
                      <TeamOutlined /> {room.participants.length}/{room.maxParticipants}
                    </Typography.Text>
                    <Typography.Text className="italic">
                      by {room.createdBy.username}
                    </Typography.Text>
                  </Space>
                </div>
                
                <Button
                  type="primary"
                  block
                  onClick={() => handleJoinRoom(room._id)}
                >
                  Join Room
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      <CreateRoomModal
        visible={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onCreateRoom={handleCreateRoom}
        popularTopics={popularTopics}
        getTopicDisplayName={getTopicDisplayName}
      />
    </div>
  );
};

// Create Room Modal Component
const CreateRoomModal = ({ visible, onClose, onCreateRoom, popularTopics, getTopicDisplayName }) => {
  const [form] = Form.useForm();

  const handleSubmit = (values) => {
    onCreateRoom(values);
    form.resetFields();
  };

  return (
    <Modal
      title="Create New Room"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={500}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="create-room-form"
      >
        <Form.Item
          name="name"
          label="Room Name"
          rules={[{ required: true, message: 'Please enter room name' }]}
        >
          <Input
            placeholder="Enter room name"
            maxLength={50}
          />
        </Form.Item>
        
        <Form.Item
          name="description"
          label="Description"
        >
          <Input.TextArea
            placeholder="Describe what this room is about"
            rows={3}
            maxLength={200}
          />
        </Form.Item>
        
        <Form.Item
          name="topic"
          label="Topic"
          rules={[{ required: true, message: 'Please enter topic' }]}
        >
          <Input
            placeholder="Enter any topic (e.g., React, Cooking, Travel...)"
            maxLength={50}
            list="create-topic-suggestions"
          />
          <datalist id="create-topic-suggestions">
            {popularTopics.map(topic => (
              <option key={topic} value={topic} />
            ))}
          </datalist>
        </Form.Item>
        
        <Form.Item
          name="maxParticipants"
          label="Max Participants"
          initialValue={50}
        >
          <Input
            type="number"
            min={2}
            max={100}
          />
        </Form.Item>
        
        <Form.Item className="form-actions">
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={onClose}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit">
              Create Room
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default Rooms;
