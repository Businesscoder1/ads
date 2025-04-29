// server.js
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // you don't need body-parser separately in modern Express

// Create MySQL Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'study',
  password: 'trishul47',
  database: 'hostel'
});

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1); // exit if connection fails
  }
  console.log('Connected to MySQL database');
});

// POST route to save form data
app.post('/admissions', (req, res) => {
  console.log('Form data received:', req.body);
  const { fullName, dob, gender, email, phone, address, course, year } = req.body;

  if (!fullName || !dob || !gender || !email || !phone || !address || !course || !year) {
    return res.status(400).json({ message: 'Please fill all required fields.' });
  }

  const sql = `
    INSERT INTO admissions 
    (full_name, dob, gender, email, phone, address, course, year_of_study) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [fullName, dob, gender, email, phone, address, course, year], (err, result) => {
    if (err) {
      console.error('Error inserting data:', err.message);
      return res.status(500).json({ message: 'Internal server error.' });
    }
    res.status(201).json({ message: 'Admission submitted successfully.' });
  });
});

// Health check route
app.get('/', (req, res) => {
  res.send('Server is running ✅');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
