const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  methods: ['POST', 'GET']
}));
app.use(bodyParser.json());

// MongoDB Connection with retry logic
const connectWithRetry = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hostel', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.log('Retrying connection in 5 seconds...');
    setTimeout(connectWithRetry, 5000);
  }
};

connectWithRetry();

// Schema with validation
const admissionSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: uuidv4
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  dob: {
    type: Date,
    required: [true, 'Date of birth is required'],
    validate: {
      validator: function(value) {
        return value instanceof Date && !isNaN(value);
      },
      message: 'Invalid date format'
    }
  },
  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: ['Male', 'Female', 'Other']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^\d{10}$/, 'Invalid phone number format']
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true
  },
  course: {
    type: String,
    required: [true, 'Course is required'],
    trim: true
  },
  year: {
    type: Number,
    required: [true, 'Year of study is required'],
    min: [1, 'Minimum year is 1'],
    max: [4, 'Maximum year is 4']
  }
}, {
  collection: 'admissions',
  timestamps: true
});

const Admission = mongoose.model('Admission', admissionSchema);

// Enhanced POST route with validation
app.post('/admissions', async (req, res) => {
  try {
    // Manual validation
    const requiredFields = [
      'fullName', 'dob', 'gender', 
      'email', 'phone', 'address', 
      'course', 'year'
    ];
    
    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Create document
    const admission = new Admission({
      ...req.body,
      year: parseInt(req.body.year)
    });

    // Save to database
    const savedAdmission = await admission.save();
    
    res.status(201).json({
      message: 'Admission saved successfully',
      data: savedAdmission
    });
    
  } catch (err) {
    console.error('Database error:', err.message);
    
    let statusCode = 500;
    let errorMessage = 'Failed to save admission. Please try again later.';

    if (err.name === 'ValidationError') {
      statusCode = 400;
      errorMessage = Object.values(err.errors)
                         .map(error => error.message)
                         .join(', ');
    } else if (err.code === 11000) {
      statusCode = 409;
      errorMessage = 'Duplicate entry found';
    }

    res.status(statusCode).json({
      message: errorMessage
    });
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.status(200).json({
      status: 'OK',
      database: dbStatus
    });
  } catch (err) {
    res.status(500).json({
      status: 'DOWN',
      database: 'disconnected'
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});