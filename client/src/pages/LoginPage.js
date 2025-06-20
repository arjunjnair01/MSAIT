import React, { useState } from 'react';
import { Button, Typography, Container, Paper, Stack, TextField, Alert } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const heroVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 1, type: 'spring', stiffness: 60 } },
};

const buttonVariants = {
  hover: { scale: 1.08, boxShadow: '0 0 24px #8f9eff' },
};

const LoginPage = () => {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`http://localhost:5000/api/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        navigate('/history');
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Network error');
    }
    setLoading(false);
  };

  return (
    <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <motion.div variants={heroVariants} initial="hidden" animate="visible" style={{ width: '100%' }}>
        <Paper elevation={8} sx={{ p: 6, width: '100%', borderRadius: 4, background: 'rgba(18,30,60,0.95)', boxShadow: '0 8px 32px 0 #0a192f', backdropFilter: 'blur(8px)' }}>
          <Stack spacing={5} alignItems="center">
            <Typography variant="h4" fontWeight={800} color="#8f9eff" gutterBottom>
              {mode === 'login' ? 'Login to Continue' : 'Create an Account'}
            </Typography>
            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
              <Stack spacing={3} alignItems="center">
                <TextField
                  label="Username"
                  variant="outlined"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  fullWidth
                  required
                  sx={{ input: { color: '#fff' }, label: { color: '#8f9eff' } }}
                />
                <TextField
                  label="Password"
                  type="password"
                  variant="outlined"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  fullWidth
                  required
                  sx={{ input: { color: '#fff' }, label: { color: '#8f9eff' } }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  color="secondary"
                  size="large"
                  disabled={loading}
                  sx={{ textTransform: 'none', fontWeight: 700, fontSize: 20, px: 5, py: 2, background: '#8f9eff', color: '#181e3c', boxShadow: '0 0 24px #8f9eff99' }}
                >
                  {loading ? (mode === 'login' ? 'Logging in...' : 'Signing up...') : (mode === 'login' ? 'Login' : 'Sign Up')}
                </Button>
                <Button
                  variant="text"
                  color="secondary"
                  onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                  sx={{ textTransform: 'none', fontWeight: 600, color: '#8f9eff' }}
                >
                  {mode === 'login' ? "Don't have an account? Sign Up" : 'Already have an account? Login'}
                </Button>
                {error && <Alert severity="error">{error}</Alert>}
              </Stack>
            </form>
            {/* Google login button placeholder */}
            {/* <motion.div variants={buttonVariants} whileHover="hover">
              <Button variant="contained" color="secondary" size="large" startIcon={<GoogleIcon />} sx={{ textTransform: 'none', fontWeight: 700, fontSize: 20, px: 5, py: 2, background: '#8f9eff', color: '#181e3c', boxShadow: '0 0 24px #8f9eff99' }}>
                Sign in with Google
              </Button>
            </motion.div> */}
          </Stack>
        </Paper>
      </motion.div>
    </Container>
  );
};

export default LoginPage; 