import React, { useEffect, useRef, useState } from 'react';
import { Button, Typography, Container, Stack, Paper, Grid, Card, CardContent, Box } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import MicIcon from '@mui/icons-material/Mic';
import SummarizeIcon from '@mui/icons-material/Summarize';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const heroVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 1, type: 'spring', stiffness: 60 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: 0.2 + i * 0.15, duration: 0.7, type: 'spring', stiffness: 60 } }),
  hover: { scale: 1.05, boxShadow: '0 0 24px #8f9eff55' },
};

const buttonVariants = {
  hover: { scale: 1.08, boxShadow: '0 0 24px #8f9eff' },
};

const features = [
  {
    icon: <MicIcon sx={{ fontSize: 40, color: '#8f9eff' }} />,
    title: 'Record or Upload',
    desc: 'Record your meeting directly or upload an existing audio file',
  },
  {
    icon: <SummarizeIcon sx={{ fontSize: 40, color: '#8f9eff' }} />,
    title: 'AI Summary',
    desc: 'Get intelligent meeting minutes and key discussion points',
  },
  {
    icon: <AssignmentTurnedInIcon sx={{ fontSize: 40, color: '#8f9eff' }} />,
    title: 'Action Items',
    desc: 'Automatically extract tasks, deadlines, and assignees',
  },
  {
    icon: <CalendarMonthIcon sx={{ fontSize: 40, color: '#8f9eff' }} />,
    title: 'Calendar Integration',
    desc: 'Sync tasks with Google Calendar for team coordination',
  },
];

const LandingPage = () => {
  const [uploadStatus, setUploadStatus] = useState(null);
  const fileInputRef = useRef();
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('http://localhost:5000/api/ping')
      .then(res => res.json())
      .then(data => console.log('Backend says:', data));
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('audio', file);
    setUploadStatus('Processing...');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/process-audio', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setUploadStatus('Processing complete! Redirecting...');
        navigate(`/meeting/${data._id}`);
      } else {
        setUploadStatus(data.error || 'Processing failed');
      }
    } catch (err) {
      setUploadStatus('Processing failed');
    }
  };

  const handleRecord = async () => {
    if (recording) {
      // Stop recording
      mediaRecorder.stop();
      setRecording(false);
    } else {
      // Start recording
      setUploadStatus(null);
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const recorder = new window.MediaRecorder(stream);
          setMediaRecorder(recorder);
          setAudioChunks([]);
          recorder.ondataavailable = (e) => {
            setAudioChunks((prev) => [...prev, e.data]);
          };
          recorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');
            setUploadStatus('Processing recorded audio...');
            try {
              const token = localStorage.getItem('token');
              const res = await fetch('http://localhost:5000/api/process-audio', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
              });
              const data = await res.json();
              if (res.ok) {
                setUploadStatus('Processing complete! Redirecting...');
                navigate(`/meeting/${data._id}`);
              } else {
                setUploadStatus(data.error || 'Processing failed');
              }
            } catch (err) {
              setUploadStatus('Processing failed');
            }
          };
          recorder.start();
          setRecording(true);
        } catch (err) {
          setUploadStatus('Microphone access denied');
        }
      } else {
        setUploadStatus('Audio recording not supported');
      }
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a192f 0%, #1a237e 100%)', py: 6 }}>
      <Container maxWidth="lg">
        {/* Hero Section */}
        <motion.div variants={heroVariants} initial="hidden" animate="visible">
          <Paper elevation={0} sx={{ mb: 6, p: 6, borderRadius: 6, background: 'rgba(18,30,60,0.85)', backdropFilter: 'blur(8px)', boxShadow: '0 8px 32px 0 #0a192f', textAlign: 'center' }}>
            <Typography variant="h2" fontWeight={900} color="#8f9eff" gutterBottom sx={{ textShadow: '0 2px 32px #8f9eff55', fontSize: { xs: 36, md: 56 } }}>
              AI-Powered Meeting Summarizer
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 700, mx: 'auto', fontSize: { xs: 16, md: 22 } }}>
              Upload or record your meeting audio and let AI generate summaries, action items, and calendar events
            </Typography>
          </Paper>
        </motion.div>
        {/* Features Section */}
        <Grid container spacing={4} justifyContent="center" sx={{ mb: 6 }}>
          {features.map((feature, i) => (
            <Grid item xs={12} sm={6} md={3} key={feature.title}>
              <motion.div
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                whileHover="hover"
                custom={i}
              >
                <Card sx={{ borderRadius: 4, background: 'rgba(20,40,80,0.85)', boxShadow: '0 4px 24px #0a192f33', minHeight: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, px: 2 }}>
                  {feature.icon}
                  <CardContent>
                    <Typography variant="h6" fontWeight={700} color="#8f9eff" gutterBottom align="center">
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" align="center">
                      {feature.desc}
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
        {/* Action Area */}
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8 }}>
          <Paper elevation={8} sx={{ p: 5, borderRadius: 6, background: 'rgba(18,30,60,0.95)', boxShadow: '0 8px 32px 0 #0a192f', textAlign: 'center', maxWidth: 700, mx: 'auto' }}>
            <Typography variant="h5" fontWeight={700} color="#8f9eff" gutterBottom>
              Start Summarizing Your Meeting
            </Typography>
            <Grid container spacing={4} justifyContent="center" alignItems="center">
              <Grid item xs={12} sm={6}>
                <motion.div variants={buttonVariants} whileHover="hover">
                  <Button fullWidth variant="contained" size="large" startIcon={<CloudUploadIcon />} sx={{ fontWeight: 700, px: 4, py: 2, fontSize: 20, background: '#8f9eff', color: '#181e3c', boxShadow: '0 0 24px #8f9eff99', mb: 2 }} onClick={() => fileInputRef.current.click()}>
                    Upload Audio File
                  </Button>
                  <input type="file" accept="audio/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
                </motion.div>
              </Grid>
              <Grid item xs={12} sm={6}>
                <motion.div variants={buttonVariants} whileHover="hover">
                  <Button fullWidth variant={recording ? 'contained' : 'outlined'} size="large" startIcon={<MicIcon />} sx={{ fontWeight: 700, px: 4, py: 2, fontSize: 20, borderWidth: 2, borderColor: '#8f9eff', color: recording ? '#181e3c' : '#8f9eff', background: recording ? '#8f9eff' : 'transparent', boxShadow: '0 0 24px #8f9eff55', mb: 2, '&:hover': { background: recording ? '#8f9eff' : '#181e3c', borderColor: '#8f9eff' } }} onClick={handleRecord}>
                  {recording ? 'Stop Recording' : 'Record Audio'}
                </Button>
                </motion.div>
              </Grid>
            </Grid>
            {uploadStatus && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                {uploadStatus}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
              Please <b>login</b> to access your meeting history and assign action items.
            </Typography>
          </Paper>
        </motion.div>
      </Container>
    </Box>
  );
};

export default LandingPage; 