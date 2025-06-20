import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link as RouterLink, useNavigate } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme, AppBar, Toolbar, Typography, Button, Box, Link } from '@mui/material';
import { motion } from 'framer-motion';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import MeetingDetailsPage from './pages/MeetingDetailsPage';
import HistoryPage from './pages/HistoryPage';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#0a192f', // dark blue
    },
    secondary: {
      main: '#64ffda', // teal accent
    },
    background: {
      default: '#0a192f',
      paper: '#112240',
    },
    text: {
      primary: '#fff',
      secondary: '#a8b2d1',
    },
  },
  typography: {
    fontFamily: 'Poppins, Roboto, Arial',
  },
});

function Navbar() {
  const navigate = useNavigate();
  const isLoggedIn = localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    // Optionally call backend logout endpoint if needed for server-side cleanup
    // fetch('/api/logout', { method: 'POST' });
    navigate('/login');
  };

  return (
    <AppBar position="static" color="primary" elevation={6} component={motion.div} initial={{ y: -80 }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 80 }}>
      <Toolbar>
        <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 700, letterSpacing: 2 }}>
          <Link component={RouterLink} to="/" underline="none" color="inherit">
            MSAIT
          </Link>
        </Typography>
        <Button color="secondary" component={RouterLink} to="/" sx={{ mx: 1 }}>
          Home
        </Button>
        {isLoggedIn && (
          <Button color="secondary" component={RouterLink} to="/history" sx={{ mx: 1 }}>
            History
          </Button>
        )}
        {isLoggedIn ? (
          <Button color="secondary" onClick={handleLogout} sx={{ mx: 1 }}>
            Logout
          </Button>
        ) : (
          <Button color="secondary" component={RouterLink} to="/login" sx={{ mx: 1 }}>
            Login
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Navbar />
        <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a192f 0%, #112240 100%)' }}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/meeting/:id" element={<MeetingDetailsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;
