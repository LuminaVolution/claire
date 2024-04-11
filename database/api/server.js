const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const expressJwt = require('express-jwt');
const bodyParser = require('body-parser');
const multer = require('multer');
const aws = require('aws-sdk');
const multerS3 = require('multer-s3');

// AWS S3 configuration
aws.config.update({
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, // Replace with your AWS secret access key
  accessKeyId: process.env.AWS_ACCESS_KEY_ID, // Replace with your AWS access key ID
  region: process.env.AWS_REGION // Replace with your S3 bucket region
});

const s3 = new aws.S3();

// Multer configuration to upload files directly to S3
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME, // Replace with your S3 bucket name
    acl: 'public-read',
    key: function (req, file, cb) {
      cb(null, Date.now().toString() + '_' + file.originalname); // This will save the file with a unique name in your S3 bucket
    }
  })
});

const app = express();
const port = 3000;

app.use(bodyParser.json()); // Middleware to parse JSON bodies

// Database connection pool setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Your database URL from an environment variable
});

// Middleware for JWT authentication
const requireAuth = expressJwt({
  secret: process.env.JWT_SECRET, // Use an environment variable for your JWT secret
  algorithms: ['HS256'],
  userProperty: 'auth'
});

// Default route to confirm API is running
app.get('/', (req, res) => res.send('Claire API Service is running'));

// Route to get all articles from the database
app.get('/data', async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM articles');
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch articles:', error);
    res.sendStatus(500);
  } finally {
    client.release();
  }
});

// Route to upload an article with a PDF file to S3 and save its data to the database
app.post('/articles', requireAuth, upload.single('file'), async (req, res) => {
  const { title, date, author, subtitle, url } = req.body;
  const filePath = req.file.location; // The file URL from S3

  const client = await pool.connect();
  try {
    const insertQuery = `
      INSERT INTO articles (title, date, author, subtitle, url, file_path)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const result = await client.query(insertQuery, [title, date, author, subtitle, url, filePath]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error saving article to the database:', error);
    res.sendStatus(500);
  } finally {
    client.release();
  }
});

// Route to authenticate a user and issue a JWT
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  // Replace with actual user authentication
  if (username === 'admin' && password === 'password') { // Dummy check for example purposes
    const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } else {
    res.status(401).send('Unauthorized');
  }
});

// A protected route that requires a valid JWT to access
app.get('/protected', requireAuth, (req, res) => {
  res.send(`Protected data for ${req.auth.username}`);
});

// Start the server
app.listen(port, () => {
  console.log(`API service listening at http://localhost:${port}`);
});
