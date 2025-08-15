const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const dbPath = path.join(__dirname, 'api_mocks.db');
const db = new sqlite3.Database(dbPath);

// Initialize database
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS mock_endpoints (
      id TEXT PRIMARY KEY,
      path TEXT NOT NULL,
      method TEXT NOT NULL,
      status_code INTEGER NOT NULL,
      response_body TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create unique index on path + method combination
  db.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_path_method 
    ON mock_endpoints(path, method)
  `);
});

// Helper function to parse query parameters from path
const parsePathWithQuery = (fullPath) => {
  const [basePath, queryString] = fullPath.split('?');
  const queryParams = {};

  if (queryString) {
    queryString.split('&').forEach(param => {
      const [key, value] = param.split('=');
      if (key) {
        queryParams[decodeURIComponent(key)] = decodeURIComponent(value || '');
      }
    });
  }

  return { basePath, queryParams };
};

// Helper function to match paths (including wildcards and query params)
const matchPath = (requestPath, requestQuery, storedPath) => {
  const { basePath: storedBasePath, queryParams: storedQueryParams } = parsePathWithQuery(storedPath);

  // Basic path matching (could be extended for wildcards)
  if (requestPath !== storedBasePath) {
    return false;
  }

  // If stored path has query params, check if request matches
  for (const [key, value] of Object.entries(storedQueryParams)) {
    if (requestQuery[key] !== value) {
      return false;
    }
  }

  return true;
};

// Management API Routes (for the frontend)
// Get all endpoints
app.get('/api/_manage/endpoints', (req, res) => {
  db.all(
    'SELECT * FROM mock_endpoints ORDER BY created_at DESC',
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const endpoints = rows.map(row => ({
        id: row.id,
        path: row.path,
        method: row.method,
        statusCode: row.status_code,
        body: row.response_body,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      res.json(endpoints);
    }
  );
});

// Create endpoint
app.post('/api/_manage/endpoints', (req, res) => {
  const { path: endpointPath, method, statusCode, body } = req.body;

  if (!endpointPath || !method || !statusCode || !body) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate JSON body
  try {
    JSON.parse(body);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON in response body' });
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO mock_endpoints (id, path, method, status_code, response_body, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, endpointPath, method.toUpperCase(), statusCode, body, now, now],
    function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          return res.status(409).json({ error: 'Endpoint with this path and method already exists' });
        }
        return res.status(500).json({ error: err.message });
      }

      res.status(201).json({
        id,
        path: endpointPath,
        method: method.toUpperCase(),
        statusCode,
        body,
        createdAt: now,
        updatedAt: now
      });
    }
  );
});

// Update endpoint
app.put('/api/_manage/endpoints/:id', (req, res) => {
  const { id } = req.params;
  const { path: endpointPath, method, statusCode, body } = req.body;

  if (!endpointPath || !method || !statusCode || !body) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate JSON body
  try {
    JSON.parse(body);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON in response body' });
  }

  const now = new Date().toISOString();

  db.run(
    `UPDATE mock_endpoints 
     SET path = ?, method = ?, status_code = ?, response_body = ?, updated_at = ?
     WHERE id = ?`,
    [endpointPath, method.toUpperCase(), statusCode, body, now, id],
    function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          return res.status(409).json({ error: 'Endpoint with this path and method already exists' });
        }
        return res.status(500).json({ error: err.message });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Endpoint not found' });
      }

      res.json({
        id,
        path: endpointPath,
        method: method.toUpperCase(),
        statusCode,
        body,
        updatedAt: now
      });
    }
  );
});

// Delete endpoint
app.delete('/api/_manage/endpoints/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM mock_endpoints WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }

    res.status(204).send();
  });
});

// Dynamic Mock API Handler
// This catches ALL requests and tries to match them against stored endpoints
app.all('*', (req, res) => {
  // Skip management API routes
  if (req.path.startsWith('/api/_manage/')) {
    return res.status(404).json({ error: 'Not found' });
  }

  const requestMethod = req.method.toUpperCase();
  const requestPath = req.path;
  const requestQuery = req.query;

  // Find matching endpoint
  db.all(
    'SELECT * FROM mock_endpoints WHERE method = ?',
    [requestMethod],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Internal server error' });
      }

      // Find the first matching endpoint
      const matchingEndpoint = rows.find(endpoint => 
        matchPath(requestPath, requestQuery, endpoint.path)
      );

      if (!matchingEndpoint) {
        return res.status(404).json({ 
          error: 'Mock endpoint not found',
          path: requestPath,
          method: requestMethod
        });
      }

      // Parse and return the mock response
      try {
        const responseBody = JSON.parse(matchingEndpoint.response_body);
        res.status(matchingEndpoint.status_code).json(responseBody);
      } catch (e) {
        // If stored body is not valid JSON, return as text
        res.status(matchingEndpoint.status_code).send(matchingEndpoint.response_body);
      }
    }
  );
});

// Start server
app.listen(PORT, () => {
  console.log(`API Mock Server running on port ${PORT}`);
  console.log(`Management API: http://localhost:${PORT}/api/_manage/endpoints`);
  console.log(`Mock APIs will be available at: http://localhost:${PORT}/*`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});
