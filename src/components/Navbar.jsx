import React from 'react';

const Navbar = ({ user, isConnected, onShowRooms, onLogout, onShowProfile }) => {

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center bg-gray-50 rounded-full p-2">
            <img 
              src="/webchat-logo.svg" 
              alt="WebChat" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col">
            <h4 className="m-0 text-gray-900 text-lg md:text-xl font-semibold">WebChat</h4>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
              <span className={`inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span>{isConnected ? 'Connected' : 'Connecting...'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-500 rounded-md hover:bg-blue-50 transition"
            onClick={onShowRooms}
          >
            🏠 Rooms
          </button>
          <div className="relative group">
            <button className="px-3 py-2 text-lg border border-gray-200 rounded-md text-gray-600 hover:border-blue-500 hover:text-blue-600 transition">
              ⋮
            </button>
            <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-100 rounded-lg shadow-lg py-1 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition">
              <button className="w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-gray-50" onClick={onShowProfile}>
                👤 Profile
              </button>
              <button className="w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-gray-50" onClick={onShowRooms}>
                🏠 View Rooms
              </button>
              <div className="h-px bg-gray-100 my-1"></div>
              <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50" onClick={onLogout}>
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
