const express = require('express');
const sql = require('mssql');
const path = require('path');
const cors = require('cors');

const app = express();
const port = 5000;

// SQL Server configuration
// const config = {
//   user: 'user',
//   password: 'UserPassword!123',
//   server: 'localhost',   // or your machine name
//   database: 'SohozeSomadhan',
//   options: {
//     encrypt: false,
//     trustServerCertificate: true,
//     port: 1433           // fixed port
//   }
// };

const config = {
  user: 'srfinanc_sohoje_admin',
  password: 'Sohoje@Admin123',
  server: 'win12.hostseba.com',  // your hosting server
  database: 'sohoje_db',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    port: 1433                   // replace with actual TCP port if different
  }
};

// Enable CORS for all origins
app.use(cors());

// Middleware to parse JSON request bodies
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Serve static files from the current directory
app.use(express.static(__dirname));


// Create a reusable connection pool
let pool;
async function getPool() {
  if (!pool) {
    pool = await sql.connect(config);
  }
  return pool;
}

/* ==============================
   ORDERS ENDPOINTS
============================== */

// GET all orders
app.get('/api/orders', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT * FROM ordermanagement');
    res.json(result.recordset);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST create a new order
app.post('/api/add_orders', async (req, res) => {
  try {
    const {
      customer_name,
      address,
      phone,
      service,
      status,
      date,
      assigned_person,
      income
    } = req.body;

    if (!customer_name || !status || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate)) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const serviceStr = Array.isArray(service) ? service.join(', ') : service || '';
    const assignedPersonStr = Array.isArray(assigned_person) ? assigned_person.join(', ') : assigned_person || '';
    const incomeVal = parseFloat(income) || 0;

    const pool = await getPool();
    const request = pool.request();
    request.input('customer_name', sql.NVarChar, customer_name);
    request.input('address', sql.NVarChar, address || '');
    request.input('phone', sql.NVarChar, phone || '');
    request.input('service', sql.NVarChar, serviceStr);
    request.input('status', sql.NVarChar, status);
    request.input('date', sql.Date, parsedDate);
    request.input('assigned_person', sql.NVarChar, assignedPersonStr);
    request.input('income', sql.Decimal(18, 2), incomeVal);

    const insertQuery = `
      INSERT INTO ordermanagement
        (customer_name, address, phone, service, status, date, assigned_person, income)
      OUTPUT INSERTED.id
      VALUES
        (@customer_name, @address, @phone, @service, @status, @date, @assigned_person, @income);
    `;

    const result = await request.query(insertQuery);
    res.status(201).json({ message: 'Order created', id: result.recordset[0].id });
  } catch (err) {
    console.error('Insert error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// PUT update order by ID
app.put('/api/update_orders/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid order ID' });

    const {
      customer_name,
      address,
      phone,
      service,
      status,
      date,
      assigned_person,
      income
    } = req.body;

    if (!customer_name || !status || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const serviceStr = Array.isArray(service) ? service.join(', ') : service || '';
    const assignedPersonStr = Array.isArray(assigned_person) ? assigned_person.join(', ') : assigned_person || '';
    const incomeVal = parseFloat(income) || 0;
    const parsedDate = new Date(date);

    const pool = await getPool();
    const request = pool.request();
    request.input('id', sql.Int, id);
    request.input('customer_name', sql.NVarChar, customer_name);
    request.input('address', sql.NVarChar, address || '');
    request.input('phone', sql.NVarChar, phone || '');
    request.input('service', sql.NVarChar, serviceStr);
    request.input('status', sql.NVarChar, status);
    request.input('date', sql.Date, parsedDate);
    request.input('assigned_person', sql.NVarChar, assignedPersonStr);
    request.input('income', sql.Decimal(18, 2), incomeVal);

    const updateQuery = `
      UPDATE ordermanagement SET
        customer_name=@customer_name,
        address=@address,
        phone=@phone,
        service=@service,
        status=@status,
        date=@date,
        assigned_person=@assigned_person,
        income=@income
      WHERE id=@id;
    `;

    const result = await request.query(updateQuery);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ message: 'Order updated' });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// DELETE order by ID
app.delete('/api/delete_orders/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid order ID' });

    const pool = await getPool();
    const request = pool.request();
    request.input('id', sql.Int, id);

    const result = await request.query('DELETE FROM ordermanagement WHERE id=@id');
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ message: 'Order deleted' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

/* ==============================
   REVIEWS ENDPOINTS
============================== */

// GET all reviews
app.get('/api/reviews', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`
        SELECT service, customer_name, review, rating
        FROM reviews
        ORDER BY id DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Reviews DB error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST add a review
app.post('/api/save_reviews', async (req, res) => {
  try {
    const { service, customer_name, review, rating } = req.body;
    if (!service || !customer_name || !review || !rating) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const pool = await getPool();
    const request = pool.request();
    request.input('service', sql.NVarChar, service);
    request.input('customer_name', sql.NVarChar, customer_name);
    request.input('review', sql.NVarChar, review);
    request.input('rating', sql.Int, rating);

    await request.query(`
      INSERT INTO reviews (service, customer_name, review, rating)
      VALUES (@service, @customer_name, @review, @rating);
    `);

    res.status(201).json({ message: 'Review added successfully' });
  } catch (err) {
    console.error('Save review error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
