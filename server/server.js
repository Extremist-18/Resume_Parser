const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParser = require('pdf-parse');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer({ dest: 'uploads/', limits: { fileSize: 5*1024*1024 } }); // limit: 5MB
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Load env vars
const MONGO_USER = process.env.MONGO_USER;
const MONGO_PASS = process.env.MONGO_PASS;
const MONGODB_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 4001;

if (!MONGO_USER || !MONGO_PASS || !MONGODB_URI) {
  console.error('Missing required environment variables:', {
    MONGO_USER,
    MONGO_PASS,
    MONGODB_URI
  });
  process.exit(1);
}

// MongoDB connection 
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
})
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    console.error('Connection string:', MONGODB_URI);
    process.exit(1);
  });

// Mongoose schema
const ResumeSchema = new mongoose.Schema({
  fileName: String,
  fullName: String,
  email: String,
  phone: String,
  skills: [String],
  sections: [Object],
  textContent: String,
  uploadedAt: { type: Date, default: Date.now }
});
const Resume = mongoose.model('Resume', ResumeSchema);

// Upload endpoint
app.post('/upload', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const filePath = path.join(__dirname, req.file.path);
    const pdfBuffer = fs.readFileSync(filePath);

    const data = await pdfParser(pdfBuffer);

    // empty file case
    if (!data.text || data.text.trim().length === 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'No text extracted from PDF' });
    }

    const extractedData = extractResumeInfo(data.text);

    const resume = new Resume({
      fileName: req.file.originalname,
      textContent: data.text,
      ...extractedData
    });

    await resume.save();
    fs.unlinkSync(filePath);

    res.json({
      message: 'Resume processed successfully',
      fileName: req.file.originalname,
      ...extractedData
    });

  } catch (error) {
    console.error('Error processing PDF:', error);
    res.status(500).json({ error: 'Failed to process PDF', details: error.message });
  }
});

// Extraction helpers
function extractResumeInfo(text) {
  return {
    fullName: extractFullName(text),
    email: extractEmail(text),
    phone: extractPhone(text),
    skills: extractSkills(text),
    sections: extractSections(text)
  };
}

function extractFullName(text) {
  const lines = text.split('\n').filter(line => line.trim());
  const firstLine = lines[0]?.trim();
  return firstLine && firstLine.length > 3 && firstLine.length < 50 ? firstLine : '';
}

function extractEmail(text) {
  const match = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
  return match ? match[0] : '';
}

function extractPhone(text) {
  const match = text.match(/\+?\d[\d\s-]{5,}\d/g);
  return match ? match[0] : '';
}

function extractSkills(text) {
  const keywords = ['javascript', 'python', 'java', 'react', 'node.js', 'mongodb', 'sql', 'aws', 'docker', 'git', 'html', 'css'];
  const found = new Set();
  keywords.forEach(skill => {
    if (text.toLowerCase().includes(skill)) found.add(skill);
  });
  return Array.from(found);
}

function extractSections(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  const sectionKeywords = ['EXPERIENCE', 'WORK EXPERIENCE', 'PROJECTS', 'ACHIEVEMENTS', 'PUBLICATIONS', 'PAPERS', 'EDUCATION', 'CERTIFICATIONS', 'AWARDS', 'HONORS', 'COURSES', 'EXTRA CURRICULAR'];

  const output = [];
  let currentSection = null;
  let currentItem = null;

  for (let line of lines) {
    const upperLine = line.toUpperCase();

    if (sectionKeywords.includes(upperLine)) {
      if (currentSection) {
        if (currentItem) currentSection.items.push(currentItem);
        output.push(currentSection);
      }
      currentSection = { title: upperLine, items: [] };
      currentItem = null;
      continue;
    }

    if (!currentSection) continue;
    
    // handles keywords like Projects or Experience
    if (/^[A-Z][A-Za-z0-9\s\-:/&()]{3,50}$/.test(line) && !line.endsWith(':')) {
      if (currentItem) currentSection.items.push(currentItem);
      currentItem = { name: line, bullets: [] };
      continue;
    }

    if (currentItem) {
      currentItem.bullets.push(line);
    } else {
      currentItem = { name: '', bullets: [line] };
    }
  }

  if (currentItem) currentSection.items.push(currentItem);
  if (currentSection) output.push(currentSection);

  return output;
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`MongoDB URI: ${MONGODB_URI}`);
  console.log(`MongoDB User: ${MONGO_USER}`);
});