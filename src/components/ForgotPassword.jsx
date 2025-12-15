import React, { useState } from 'react';

const ForgotPassword = ({ onBackToLogin, onShowResetPassword }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-900 p-6">
      <div className="bg-neutral-100 rounded-2xl shadow-2xl p-8 w-full max-w-md text-center space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">Forgot Password?</h2>
          <p className="text-gray-600 text-sm">Enter your email address and we'll send you a password reset link.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-semibold text-gray-800">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={isLoading}
              className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-base focus:outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200 disabled:bg-gray-100"
            />
          </div>

          {error && <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg border-l-4 border-red-500 text-sm">{error}</div>}
          {message && <div className="bg-green-100 text-green-700 px-4 py-3 rounded-lg border-l-4 border-green-500 text-sm whitespace-pre-line">{message}</div>}

          <button 
            type="submit" 
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-3 rounded-lg shadow-md transition disabled:opacity-60"
            disabled={isLoading || !email}
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="flex flex-col gap-3">
          <button 
            type="button" 
            className="w-full border-2 border-blue-600 text-blue-700 font-semibold px-4 py-3 rounded-lg hover:bg-blue-600 hover:text-white transition"
            onClick={onBackToLogin}
          >
            Back to Login
          </button>
          
          {message && (
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 text-center text-sm text-teal-800">
              <p>📧 Check your email for the password reset link!</p>
              <p>If you don't see it, check your spam folder.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
