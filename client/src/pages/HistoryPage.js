import React, { useEffect, useState } from 'react';
import { Typography, Container, Paper, Stack, List, ListItem, ListItemButton, ListItemText, Divider, Box } from '@mui/material';
import { motion } from 'framer-motion';

const heroVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 1, type: 'spring', stiffness: 60 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: (i) => ({ opacity: 1, x: 0, transition: { delay: 0.2 + i * 0.1, duration: 0.5 } }),
  hover: { scale: 1.03, background: 'rgba(143,158,255,0.08)' },
};

const HistoryPage = () => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const authToken = localStorage.getItem('token');

  useEffect(() => {
    const fetchMeetings = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('http://localhost:5000/api/meetings', {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const data = await res.json();
        if (res.ok) {
          setMeetings(data);
        } else {
          if (res.status === 401) {
            setError('not_logged_in');
          } else {
            setError(data.error || 'Failed to fetch meetings');
          }
        }
      } catch (err) {
        setError('Error fetching meetings');
      }
      setLoading(false);
    };
    fetchMeetings();
  }, [authToken]);

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a192f 0%, #1a237e 100%)', py: 6 }}>
      <Container maxWidth="md" sx={{ display: 'flex', alignItems: 'center' }}>
        <motion.div variants={heroVariants} initial="hidden" animate="visible" style={{ width: '100%' }}>
          <Paper elevation={8} sx={{ p: 6, width: '100%', borderRadius: 4, background: 'rgba(18,30,60,0.95)', boxShadow: '0 8px 32px 0 #0a192f', backdropFilter: 'blur(8px)' }}>
            <Stack spacing={3}>
              <Typography variant="h4" fontWeight={800} color="#8f9eff">
                Meeting History
              </Typography>
              {loading ? (
                <Typography color="text.secondary">Loading...</Typography>
              ) : error === 'not_logged_in' ? (
                <Box sx={{ textAlign: 'center', mt: 4 }}>
                  <Typography variant="h6" color="#8f9eff" sx={{ fontWeight: 700 }}>
                    Please login to see your meeting history
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 1 }}>
                    Your meeting history is private. Login to view your past meetings and summaries.
                  </Typography>
                </Box>
              ) : error ? (
                <Typography color="error.main">{error}</Typography>
              ) : (
                <List>
                  {meetings.map((meeting, i) => (
                    <motion.div key={meeting._id} variants={itemVariants} initial="hidden" animate="visible" whileHover="hover" custom={i}>
                      <ListItem disablePadding>
                        <ListItemButton component="a" href={`/meeting/${meeting._id}`} sx={{ borderRadius: 2 }}>
                          <ListItemText
                            primary={meeting.audioFile?.originalname || meeting.audioFile?.filename || 'Untitled Audio'}
                            primaryTypographyProps={{ color: '#8f9eff', fontWeight: 600 }}
                          />
                        </ListItemButton>
                      </ListItem>
                      <Divider sx={{ background: 'rgba(143,158,255,0.12)' }} />
                    </motion.div>
                  ))}
                </List>
              )}
            </Stack>
          </Paper>
        </motion.div>
      </Container>
    </Box>
  );
};

export default HistoryPage; 