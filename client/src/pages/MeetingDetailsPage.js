import React, { useState, useEffect } from 'react';
import { Typography, Container, Paper, Stack, Divider, Box, Button, Alert, Tabs, Tab, Grid, Card } from '@mui/material';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';

const heroVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 1, type: 'spring', stiffness: 60 } },
};

const MeetingDetailsPage = () => {
  const { id } = useParams();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [linking, setLinking] = useState(false);
  const [linked, setLinked] = useState(false);
  const [calendarMsg, setCalendarMsg] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [googleConnected, setGoogleConnected] = useState(false);
  const authToken = localStorage.getItem('token');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMeeting = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`http://localhost:5000/api/meetings/${id}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const data = await res.json();
        if (res.ok) {
          setMeeting(data);
        } else {
          setError(data.error || 'Failed to fetch meeting');
        }
      } catch (err) {
        setError('Error fetching meeting');
      }
      setLoading(false);
    };
    fetchMeeting();
  }, [id, authToken]);

  useEffect(() => {
    const checkGoogleStatus = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/google-status', {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const data = await res.json();
        setGoogleConnected(!!data.connected);
      } catch (e) {
        setGoogleConnected(false);
      }
    };
    checkGoogleStatus();
  }, [authToken]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleConnectGoogle = async () => {
    setLinking(true);
    setError('');
    try {
      const res = await fetch('http://localhost:5000/api/google-auth-url', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.url) {
        const popup = window.open(data.url, '_blank', 'width=500,height=700');
        const timer = setInterval(() => {
          if (popup.closed) {
            clearInterval(timer);
            setLinked(true);
            setLinking(false);
            window.location.reload();
          }
        }, 500);
      } else {
        setError('Failed to get Google auth URL');
        setLinking(false);
      }
    } catch (err) {
      setError('Error linking Google account');
      setLinking(false);
    }
  };

  const handleAddToCalendar = async (actionIdx) => {
    setCalendarMsg('');
    setError('');
    try {
      const res = await fetch(`http://localhost:5000/api/meetings/${id}/action/${actionIdx}/calendar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.htmlLink) {
        setCalendarMsg('Event added to Google Calendar!');
        window.open(data.htmlLink, '_blank');
      } else {
        setError(data.error || 'Failed to add event');
      }
    } catch (err) {
      setError('Error adding to calendar');
    }
  };

  // Download meeting minutes as .txt
  const handleDownloadMinutes = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/meetings/${meeting._id}/minutes-txt`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error('Failed to download minutes');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meeting_minutes_${meeting._id}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to download minutes.');
    }
  };

  if (loading) {
    return <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography color="text.secondary">Loading...</Typography></Box>;
  }
  if (error) {
    return <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography color="error.main">{error}</Typography></Box>;
  }
  if (!meeting) return null;

  // Construct audio file URL
  const audioUrl = meeting.audioFile && meeting.audioFile.filename
    ? `http://localhost:5000/uploads/${meeting.audioFile.filename}`
    : null;

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a192f 0%, #1a237e 100%)', py: 6 }}>
      <Container maxWidth="lg" sx={{ display: 'flex', alignItems: 'flex-start' }}>
        <motion.div variants={heroVariants} initial="hidden" animate="visible" style={{ width: '100%' }}>
          <Grid container spacing={4}>
            {/* Left Column: Main Content */}
            <Grid item xs={12} md={7}>
              <Paper elevation={8} sx={{ p: 5, borderRadius: 4, background: 'rgba(18,30,60,0.97)', boxShadow: '0 8px 32px 0 #0a192f', mb: 3 }}>
                <Stack spacing={3}>
                  <Typography variant="h4" fontWeight={800} color="#8f9eff" gutterBottom>
                    Meeting Summary
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                    {meeting.summary || 'No summary available.'}
                  </Typography>
                  <Divider />
                  <Typography variant="h5" fontWeight={700} color="#8f9eff" gutterBottom>
                    Audio Transcript
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                    {meeting.transcript || 'No transcript available.'}
                  </Typography>
                  <Divider />
                  <Typography variant="h5" fontWeight={700} color="#8f9eff" gutterBottom>
                    Extract Items
                  </Typography>
                  {meeting.details ? (
                    <Stack spacing={3}>
                      {Object.entries(meeting.details).map(([key, value]) =>
                        value && value.length > 0 ? (
                          <div key={key}>
                            <Typography variant="subtitle1" fontWeight={600} color="#8f9eff" gutterBottom>
                              {key.charAt(0).toUpperCase() + key.slice(1)}
                            </Typography>
                            <Stack spacing={2}>
                              {value.map((item, idx) => (
                                <Box
                                  key={idx}
                                  sx={{
                                    background: 'rgba(143,158,255,0.07)',
                                    borderRadius: 2,
                                    p: 2,
                                    mb: 1,
                                    boxShadow: '0 2px 8px 0 #0a192f22',
                                  }}
                                >
                                  {typeof item === 'object' ? (
                                    <Stack spacing={0.5}>
                                      {Object.entries(item).map(([field, val]) => (
                                        <Typography key={field} variant="body2" color="text.secondary">
                                          <b style={{ color: '#8f9eff' }}>{field.charAt(0).toUpperCase() + field.slice(1)}:</b> {val}
                                        </Typography>
                                      ))}
                                    </Stack>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">{item}</Typography>
                                  )}
                                </Box>
                              ))}
                            </Stack>
                          </div>
                        ) : null
                      )}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">No extracted items available.</Typography>
                  )}
                </Stack>
              </Paper>
            </Grid>
            {/* Right Column: Actions & Info */}
            <Grid item xs={12} md={5}>
              <Stack spacing={3}>
                {/* Download Minutes Button */}
                <Card elevation={6} sx={{ p: 3, borderRadius: 4, background: 'rgba(143,158,255,0.10)' }}>
                  <Button fullWidth variant="outlined" color="secondary" onClick={handleDownloadMinutes} sx={{ fontWeight: 700 }}>
                    Download Minutes (.txt)
                  </Button>
                </Card>
                {/* Audio Player Section */}
                {audioUrl && (
                  <Card elevation={6} sx={{ p: 3, borderRadius: 4, background: 'rgba(143,158,255,0.10)' }}>
                    <Typography variant="h6" fontWeight={700} color="#8f9eff" gutterBottom>
                      Uploaded Audio
                    </Typography>
                    <audio controls style={{ width: '100%' }}>
                      <source src={audioUrl} />
                      Your browser does not support the audio element.
                    </audio>
                  </Card>
                )}
                {/* Google Calendar Connect Button and Scheduled Events */}
                <Card elevation={6} sx={{ p: 3, borderRadius: 4, background: 'rgba(143,158,255,0.10)' }}>
                  {!googleConnected ? (
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={handleConnectGoogle}
                      disabled={linking}
                      fullWidth
                      sx={{ fontWeight: 700 }}
                    >
                      {linking ? 'Connecting...' : 'Connect Google Calendar'}
                    </Button>
                  ) : (
                    meeting && meeting.scheduledEvents && meeting.scheduledEvents.length > 0 && (
                      <Box>
                        <Typography variant="h6" fontWeight={700} color="#8f9eff" gutterBottom>
                          Scheduled Google Calendar Events
                        </Typography>
                        <Stack spacing={2}>
                          {meeting.scheduledEvents.map((evt, idx) => (
                            <Paper key={idx} elevation={2} sx={{ p: 2, borderRadius: 2, background: 'rgba(143,158,255,0.07)' }}>
                              <Typography variant="subtitle1" color="#8f9eff" fontWeight={600}>
                                {evt.type === 'deadline' ? 'Deadline' : 'Event'}
                              </Typography>
                              <Typography variant="body2" color="text.primary" sx={{ mt: 1 }}>
                                <b>Description:</b> {evt.description}
                              </Typography>
                              <Typography variant="body2" color="text.primary">
                                <b>Date:</b> {evt.date ? new Date(evt.date).toLocaleString() : 'N/A'}
                              </Typography>
                              {evt.googleEventLink && (
                                <Button
                                  variant="outlined"
                                  color="secondary"
                                  size="small"
                                  href={evt.googleEventLink}
                                  target="_blank"
                                  sx={{ mt: 1, alignSelf: 'flex-start' }}
                                >
                                  View in Google Calendar
                                </Button>
                              )}
                            </Paper>
                          ))}
                        </Stack>
                      </Box>
                    )
                  )}
                </Card>
              </Stack>
            </Grid>
          </Grid>
        </motion.div>
      </Container>
    </Box>
  );
};

export default MeetingDetailsPage; 