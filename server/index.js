const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { google } = require('googleapis');
const { spawn } = require('child_process');
const sys = require('sys');
const requests = require('requests');
const chrono = require('chrono-node');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
require('dotenv').config({ path: __dirname + '/.env' });
const uri = "mongodb+srv://your_username:your_password@msait.wpputol.mongodb.net/?retryWrites=true&w=majority&appName=MSAIT"
console.log('MONGO_URI:', uri);

GOOGLE_CLIENT_ID="your_client_id"
GOOGLE_REDIRECT_URI="http://localhost:5000/api/google-auth-callback"
GOOGLE_CLIENT_SECRET="your_client_secret"



// MongoDB connection
mongoose.connect(uri || 'mongodb://localhost:27017/meetingai', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on('connected', () => {
  console.log('MongoDB connected');
});

// Serve uploads directory statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Basic route
app.get('/', (req, res) => {
  res.send('AI Meeting Summary & Action Tracker Backend');
});

app.get('/api/ping', (req, res) => {
  res.json({ message: 'pong' });
});

const storage = multer.diskStorage({
  destination: path.join(__dirname, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

app.post('/api/upload', authenticateToken, upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({ filename: req.file.filename, originalname: req.file.originalname, path: req.file.path });
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  googleTokens: { type: Object, default: null },
});
const User = mongoose.model('User', userSchema);

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

app.post('/api/signup', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ error: 'Signup failed', details: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ error: 'Login failed', details: err.message });
  }
});

// Meeting Schema
const meetingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  audioFile: {
    filename: String,
    originalname: String,
    path: String,
  },
  transcript: String,
  summary: String,
  details: Object,
  scheduledEvents: [
    {
      type: { type: String }, // 'deadline' or 'event'
      description: String,
      date: String,
      googleEventId: String,
      googleEventLink: String,
    }
  ],
  actionItems: [
    {
      description: String,
      assignedTo: String,
      deadline: Date,
      calendarEventId: String,
    }
  ],
  createdAt: { type: Date, default: Date.now },
});
const Meeting = mongoose.model('Meeting', meetingSchema);

// Endpoint to upload audio, process it, and create a meeting
app.post('/api/process-audio', authenticateToken, upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    // 1. Transcribe audio
    const transcript = await new Promise((resolve, reject) => {
      const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
      const py = spawn(pythonPath, ['speech_to_text.py', req.file.path], {
        cwd: __dirname,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      });
      
      let output = '';
      let error = '';
      
      py.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      py.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      py.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error(`Transcription failed with code ${code}: ${error || 'Unknown error'}`));
        }
      });
    });

    // 2. Generate summary and details using Gemini
    let summary = '';
    let details = {};
    try {
      console.log('Starting summary generation...');
      const geminiResult = await new Promise((resolve, reject) => {
        const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
        console.log('Running NLP extraction script...');
        const nlpPy = spawn(pythonPath, ['nlp_extraction.py', transcript], {
          cwd: __dirname,
          env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
        });
        let nlpOutput = '';
        let nlpError = '';
        nlpPy.stdout.on('data', (data) => {
          console.log('NLP script output:', data.toString());
          nlpOutput += data.toString();
        });
        nlpPy.stderr.on('data', (data) => {
          console.log('NLP script error:', data.toString());
          nlpError += data.toString();
        });
        nlpPy.on('close', (code) => {
          console.log('NLP script exited with code:', code);
          if (code === 0) {
            try {
              console.log('Parsing NLP output:', nlpOutput);
              const result = JSON.parse(nlpOutput);
              console.log('Parsed result:', result);
              resolve(result);
            } catch (e) {
              console.error('Failed to parse NLP output:', e);
              reject(new Error(`Failed to parse NLP output: ${e.message}`));
            }
          } else {
            console.error('NLP script failed:', nlpError);
            reject(new Error(`NLP extraction script failed with code ${code}: ${nlpError || 'Unknown error'}`));
          }
        });
      });
      summary = geminiResult.summary || '';
      details = geminiResult.details || {};
      console.log('Summary generated:', summary);
      console.log('Details extracted:', details);
    } catch (err) {
      console.error('NLP extraction error:', err);
      summary = '';
      details = {};
    }

    let scheduledEvents = [];
    try {
      // Only attempt if user has Google tokens
      const user = await User.findById(req.user.userId);
      const tokens = user && user.googleTokens;
      if (tokens) {
        const calendar = getCalendarClient(tokens);
        // Handle deadlines
        if (details.deadlines && Array.isArray(details.deadlines)) {
          for (const deadline of details.deadlines) {
            let description = deadline.task || deadline.description || 'Meeting deadline';
            let dateStr = deadline.date || deadline.deadline || null;
            if (dateStr) {
              const parsedDate = chrono.parseDate(dateStr);
              if (parsedDate) {
                try {
                  const event = {
                    summary: description,
                    description: (deadline.task || deadline.description || description),
                    start: { dateTime: parsedDate.toISOString() },
                    end: { dateTime: new Date(parsedDate.getTime() + 60 * 60 * 1000).toISOString() }, // 1 hour
                  };
                  const response = await calendar.events.insert({
                    calendarId: 'primary',
                    resource: event,
                  });
                  scheduledEvents.push({
                    type: 'deadline',
                    description,
                    date: parsedDate.toISOString(),
                    googleEventId: response.data.id,
                    googleEventLink: response.data.htmlLink,
                  });
                } catch (e) {
                  console.error('Failed to create Google Calendar event for deadline:', e);
                }
              } else {
                console.error('Could not parse date:', dateStr);
              }
            }
          }
        }
        // Handle events
        if (details.events && Array.isArray(details.events)) {
          for (const eventItem of details.events) {
            let description = eventItem.name || eventItem.description || summary || 'Meeting event';
            let dateStr = eventItem.date || eventItem.start || null;
            if (dateStr) {
              const parsedDate = chrono.parseDate(dateStr);
              if (parsedDate) {
                try {
                  const event = {
                    summary: description,
                    description: (eventItem.description || eventItem.name || description),
                    start: { dateTime: parsedDate.toISOString() },
                    end: { dateTime: new Date(parsedDate.getTime() + 60 * 60 * 1000).toISOString() }, // 1 hour
                  };
                  const response = await calendar.events.insert({
                    calendarId: 'primary',
                    resource: event,
                  });
                  scheduledEvents.push({
                    type: 'event',
                    description,
                    date: parsedDate.toISOString(),
                    googleEventId: response.data.id,
                    googleEventLink: response.data.htmlLink,
                  });
                } catch (e) {
                  console.error('Failed to create Google Calendar event for event:', e);
                }
              } else {
                console.error('Could not parse date:', dateStr);
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('Error scheduling Google Calendar events:', e);
    }

    // 3. Create meeting
    try {
      const meeting = new Meeting({
        user: req.user.userId,
        audioFile: {
          filename: req.file.filename,
          originalname: req.file.originalname,
          path: req.file.path,
        },
        transcript,
        summary,
        details,
        scheduledEvents,
        actionItems: [],
      });
      await meeting.save();
      res.status(201).json(meeting);
    } catch (dbError) {
      console.error('Database error:', dbError);
      res.status(500).json({ error: 'Failed to save meeting', details: dbError.message });
    }
  } catch (error) {
    console.error('Processing error:', error);
    res.status(500).json({ error: 'Failed to process audio', details: error.message });
  }
});

// Get all meetings for a user
app.get('/api/meetings', authenticateToken, async (req, res) => {
  try {
    const meetings = await Meeting.find({ user: req.user.userId }).sort({ createdAt: -1 });
    res.json(meetings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch meetings', details: err.message });
  }
});

// Get a specific meeting by ID
app.get('/api/meetings/:id', authenticateToken, async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ _id: req.params.id, user: req.user.userId });
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    res.json(meeting);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch meeting', details: err.message });
  }
});

// Placeholder: In production, store and manage user OAuth tokens securely
const userGoogleTokens = {}; // { userId: { access_token, refresh_token, ... } }



// Helper to get an authorized Google Calendar client
function getCalendarClient(tokens) {
  const oAuth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
  oAuth2Client.setCredentials(tokens);
  return google.calendar({ version: 'v3', auth: oAuth2Client });
}

// Endpoint to create a Google Calendar event for an action item
app.post('/api/meetings/:id/action/:actionIdx/calendar', authenticateToken, async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ _id: req.params.id, user: req.user.userId });
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    const actionIdx = parseInt(req.params.actionIdx, 10);
    const actionItem = meeting.actionItems[actionIdx];
    if (!actionItem) return res.status(404).json({ error: 'Action item not found' });

    // Get user's Google tokens (placeholder logic)
    const tokens = userGoogleTokens[req.user.userId];
    if (!tokens) return res.status(401).json({ error: 'Google account not linked' });

    const calendar = getCalendarClient(tokens);
    const event = {
      summary: actionItem.description,
      description: meeting.summary,
      start: { dateTime: actionItem.deadline },
      end: { dateTime: new Date(new Date(actionItem.deadline).getTime() + 60 * 60 * 1000).toISOString() }, // 1 hour
      attendees: actionItem.assignedTo ? [{ email: actionItem.assignedTo }] : [],
    };
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });
    actionItem.calendarEventId = response.data.id;
    await meeting.save();
    res.json({ eventId: response.data.id, htmlLink: response.data.htmlLink });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create calendar event', details: err.message });
  }
});

// Endpoint to get Google OAuth2 URL
app.get('/api/google-auth-url', authenticateToken, (req, res) => {
  const oAuth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'openid',
    'email',
    'profile',
  ];
  const url = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    state: req.user.userId,
  });
  res.json({ url });
});

// Endpoint to handle Google OAuth2 callback
app.get('/api/google-auth-callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state) return res.status(400).json({ error: 'Missing code or state' });
  const oAuth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    // Save tokens in DB
    await User.findByIdAndUpdate(state, { googleTokens: tokens });
    res.send('<script>window.close();</script>Google account linked! You can close this window.');
  } catch (err) {
    res.status(500).json({ error: 'Failed to get Google tokens', details: err.message });
  }
});

// Logout endpoint (client discards token)
app.post('/api/logout', (req, res) => {
  // With stateless JWTs, backend doesn't need to do much
  res.json({ message: 'Logout successful' });
});

app.get('/api/google-status', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    res.json({ connected: !!(user && user.googleTokens) });
  } catch (e) {
    res.status(500).json({ connected: false });
  }
});

app.get('/api/meetings/:id/minutes-txt', authenticateToken, async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ _id: req.params.id, user: req.user.userId });
    if (!meeting) return res.status(404).send('Meeting not found');
    // Use Gemini to generate professional minutes
    const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
    const prompt = `Generate professional meeting minutes in standard format (with sections: Meeting Title, Date, Attendees, Agenda, Discussion Summary, Action Items with assignees and deadlines, Next Steps, etc.) from the following transcript.\nTranscript:\n${meeting.transcript}`;
    let geminiOutput = '';
    let geminiError = '';
    await new Promise((resolve, reject) => {
      const py = spawn(pythonPath, ['-c', `import sys, os, requests, json;\n\
GEMINI_API_KEY = "your_api_key";\n\
GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=' + GEMINI_API_KEY\n\
headers = {'Content-Type': 'application/json'}\n\
data = {"contents": [{"parts": [{"text": sys.argv[1]}]}]}\n\
response = requests.post(GEMINI_API_URL, headers=headers, data=json.dumps(data))\n\
if response.status_code == 200:\n\
    try:\n\
        candidates = response.json().get('candidates', [])\n\
        if candidates:\n\
            text = candidates[0]['content']['parts'][0]['text']\n\
            print(text)\n\
        else:\n\
            print('No candidates returned from Gemini API.')\n\
    except Exception as e:\n\
        print(f'Failed to parse Gemini response: {e}')\n\
else:\n\
    print(f'Gemini API error: {response.status_code}')\n\
    print(response.text)\n`, prompt], {
        cwd: __dirname,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      });
      py.stdout.on('data', (data) => { geminiOutput += data.toString(); });
      py.stderr.on('data', (data) => { geminiError += data.toString(); });
      py.on('close', (code) => {
        if (code === 0) resolve(); else reject(geminiError || 'Gemini minutes generation failed');
      });
    });
    res.setHeader('Content-Disposition', `attachment; filename=meeting_minutes_${meeting._id}.txt`);
    res.setHeader('Content-Type', 'text/plain');
    res.send(geminiOutput.trim());
  } catch (e) {
    res.status(500).send('Failed to generate minutes.');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 