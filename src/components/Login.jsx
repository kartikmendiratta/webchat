import React, { useState } from 'react';
import { Button, Input, Checkbox, Card, Typography, Space, Divider } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';

const Login = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    topics: []
  });

  const availableTopics = [
    { value: 'webdev', label: 'Web Development' },
    { value: 'ml', label: 'Machine Learning' },
    { value: 'ai', label: 'Artificial Intelligence' },
    { value: 'data-science', label: 'Data Science' },
    { value: 'mobile-dev', label: 'Mobile Development' },
    { value: 'devops', label: 'DevOps' },
    { value: 'cybersecurity', label: 'Cybersecurity' },
    { value: 'blockchain', label: 'Blockchain' },
    { value: 'gaming', label: 'Gaming' },
    { value: 'design', label: 'Design' },
    { value: 'startup', label: 'Startup' },
    { value: 'career', label: 'Career' },
    { value: 'general', label: 'General' },
    { value: 'programming', label: 'Programming' },
    { value: 'databases', label: 'Databases' },
    { value: 'cloud', label: 'Cloud' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTopicChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      topics: prev.topics.includes(value) 
        ? prev.topics.filter(topic => topic !== value)
        : [...prev.topics, value]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const url = isLogin ? `${backendUrl}/api/auth/login` : `${backendUrl}/api/auth/register`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin(data.user);
        alert(isLogin ? 'Login successful!' : 'Registration successful!');
      } else {
        alert(data.message || 'An error occurred');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return <ForgotPassword onBackToLogin={() => setShowForgotPassword(false)} />;
  }

  if (showResetPassword) {
    return <ResetPassword token={resetToken} onBackToLogin={() => setShowResetPassword(false)} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] p-6 overflow-y-auto">
      <Card className="w-full max-w-[400px] mx-auto shadow-lg rounded-lg bg-[#2d2d2d] border border-[#404040]" bordered={false}>
        <div className="text-center mb-8">
          <div className="w-[60px] h-[60px] bg-white rounded-full flex items-center justify-center mx-auto mb-4 p-2 shadow-md">
            <img 
              src="/webchat-logo.svg" 
              alt="WebChat" 
              className="w-full h-full object-contain"
            />
          </div>
          <Typography.Title level={2} className="!m-0 !mb-2 !text-white">WebChat</Typography.Title>
          <Typography.Text className="!text-gray-400">
            {isLogin ? 'Welcome back!' : 'Join the conversation!'}
          </Typography.Text>
        </div>

        <form onSubmit={handleSubmit} className="w-full">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {!isLogin && (
              <Input
                prefix={<UserOutlined />}
                placeholder="Enter your username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
                size="large"
              />
            )}

            <Input
              prefix={<MailOutlined />}
              type="email"
              placeholder="Enter your email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              size="large"
            />

            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Enter your password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              size="large"
            />

            {!isLogin && (
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Confirm your password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                size="large"
              />
            )}

            {!isLogin && (
              <div className="my-4">
                <Typography.Text strong className="!text-white">Interests (Select multiple)</Typography.Text>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2 mt-3 text-white">
                  {availableTopics.map(topic => (
                    <Checkbox
                      key={topic.value}
                      value={topic.value}
                      checked={formData.topics.includes(topic.value)}
                      onChange={handleTopicChange}
                      className="text-white"
                    >
                      {topic.label}
                    </Checkbox>
                  ))}
                </div>
              </div>
            )}

            <Button 
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              block
              className="mt-4"
            >
              {isLogin ? 'Login' : 'Register'}
            </Button>
          </Space>
        </form>

        <Divider className="bg-gray-600" />
        
        <div className="text-center">
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Button 
              type="link"
              onClick={() => setIsLogin(!isLogin)}
              className="!p-0 !h-auto text-sm !text-[#1890ff]"
            >
              {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
            </Button>
            
            {isLogin && (
              <Button 
                type="link"
                onClick={() => setShowForgotPassword(true)}
                className="!p-0 !h-auto text-sm !text-[#1890ff]"
              >
                Forgot Password?
              </Button>
            )}
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default Login;