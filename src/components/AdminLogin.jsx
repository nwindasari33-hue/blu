import React, { useState } from 'react';
import '../App.css'; // Make sure styling fits in

const AdminLogin = ({ settings, onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    const correctUsername = settings.adminUsername || 'admin';
    const correctPassword = settings.adminPassword || 'admin123';

    if (username === correctUsername && password === correctPassword) {
      sessionStorage.setItem('isAdminLoggedIn', 'true');
      onLogin();
    } else {
      setError('Username atau password salah.');
    }
  };

  return (
    <div className="admin-login-container" style={{
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      padding: '60px 20px',
      background: 'transparent'
    }}>
      <div className="admin-card" style={{ maxWidth: '400px', width: '100%', padding: '32px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '24px', color: '#1f2937' }}>Login Admin</h2>
        
        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '0.9rem',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Username</label>
            <input 
              type="text" 
              className="form-input" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-input" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button type="submit" className="btn-primary" style={{ width: '100%' }}>
            Masuk
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
