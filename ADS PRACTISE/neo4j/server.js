const express = require('express');
const neo4j = require('neo4j-driver');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  methods: ['POST', 'GET']
}));
app.use(bodyParser.json());

// Neo4j Connection
const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'hostel@1234'
  )
);

// Verify connection
const verifyConnection = async () => {
  const session = driver.session();
  try {
    await session.run('RETURN 1 AS result');
    console.log('Connected to Neo4j');
    await createConstraints();
  } catch (err) {
    console.error('Neo4j connection error:', err.message);
    setTimeout(verifyConnection, 5000);
  } finally {
    await session.close();
  }
};

// Create unique constraints
const createConstraints = async () => {
  const session = driver.session();
  try {
    await session.run(`
      CREATE CONSTRAINT IF NOT EXISTS FOR (s:Student)
      REQUIRE s.email IS UNIQUE
    `);
    console.log('Constraints created');
  } catch (err) {
    console.error('Constraint creation error:', err.message);
  } finally {
    await session.close();
  }
};

verifyConnection();

// Graph Model Structure:
// (Student:Student {
//   id: UUID,
//   fullName: string,
//   dob: date,
//   gender: string,
//   email: string,
//   phone: string,
//   address: string,
//   course: string,
//   year: integer,
//   createdAt: datetime
// })

app.post('/admissions', async (req, res) => {
  const session = driver.session();
  try {
    const { fullName, dob, gender, email, phone, address, course, year } = req.body;
    
    // Validate required fields
    if (!fullName || !dob || !email) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Cypher query to create student node
    const result = await session.run(`
      CREATE (s:Student {
        id: randomUUID(),
        fullName: $fullName,
        dob: date($dob),
        gender: $gender,
        email: $email,
        phone: $phone,
        address: $address,
        course: $course,
        year: toInteger($year),
        createdAt: datetime()
      })
      RETURN s
    `, {
      fullName,
      dob,
      gender: gender || null,
      email,
      phone: phone || null,
      address: address || null,
      course: course || null,
      year: year || null
    });

    const student = result.records[0].get('s').properties;
    
    res.status(201).json({
      message: 'Admission saved successfully',
      data: {
        ...student,
        dob: student.dob.toString(),
        createdAt: student.createdAt.toString()
      }
    });

  } catch (err) {
    console.error('Neo4j error:', err.message);
    
    let statusCode = 500;
    let errorMessage = 'Failed to save admission';

    if (err.message.includes('already exists')) {
      statusCode = 409;
      errorMessage = 'Student with this email already exists';
    }

    res.status(statusCode).json({ message: errorMessage });
  } finally {
    await session.close();
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const session = driver.session();
  try {
    const result = await session.run('MATCH (n) RETURN count(n) AS count');
    res.status(200).json({
      status: 'OK',
      nodeCount: result.records[0].get('count').toNumber()
    });
  } catch (err) {
    res.status(500).json({ status: 'DOWN' });
  } finally {
    await session.close();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});