const express = require('express');
const cassandra = require('cassandra-driver');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:4200', // Update with your Angular app's URL
  methods: ['POST', 'GET']
}));
app.use(bodyParser.json());

let client;

const connectWithRetry = async () => {
  try {
    // Initial connection without keyspace
    const initialClient = new cassandra.Client({
      contactPoints: ['127.0.0.1'],
      localDataCenter: 'datacenter1'
    });
    
    await initialClient.connect();
    
    // Create keyspace
    await initialClient.execute(`
      CREATE KEYSPACE IF NOT EXISTS hostel 
      WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}
    `);
    
    // Create new client with keyspace
    client = new cassandra.Client({
      contactPoints: ['127.0.0.1'],
      localDataCenter: 'datacenter1',
      keyspace: 'hostel'
    });
    
    await client.connect();

    // Create table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS admissions (
        id uuid PRIMARY KEY,
        full_name text,
        dob date,
        gender text,
        email text,
        phone text,
        address text,
        course text,
        year_of_study int
      )
    `);
    
    console.log('Successfully connected to Cassandra and validated schema');

  } catch (err) {
    console.error('Cassandra connection error:', err.message);
    setTimeout(connectWithRetry, 5000);
  }
};

connectWithRetry();

// API Endpoints
app.post('/admissions', async (req, res) => {
  try {
    // Input validation
    if (!req.body.fullName?.trim() || !req.body.dob) {
      return res.status(400).json({ 
        message: 'Full name and date of birth are required' 
      });
    }

    const query = `
      INSERT INTO admissions 
      (id, full_name, dob, gender, email, phone, address, course, year_of_study) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      uuidv4(),
      req.body.fullName.trim(),
      cassandra.types.LocalDate.fromDate(new Date(req.body.dob)),
      req.body.gender?.trim() || null,
      req.body.email?.trim() || null,
      req.body.phone?.trim() || null,
      req.body.address?.trim() || null,
      req.body.course?.trim() || null,
      parseInt(req.body.year) || null
    ];

    await client.execute(query, params, { prepare: true });

    res.status(201).json({ message: 'Admission saved successfully' });
    
  } catch (err) {
    console.error('Database error:', err.message);
    res.status(500).json({ 
      message: 'Failed to save admission. Please try again later.' 
    });
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    database: client ? 'connected' : 'disconnected' 
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});