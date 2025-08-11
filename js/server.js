const express = require('express');
const sql = require('mssql');
const path = require('path');
const cors = require('cors');


const app = express();
const port = 5000;

const config = {
  user: 'user',
  password: 'UserPassword!123',
  server: 'NIHAD\\SQLEXPRESS',
  database: 'SohozeSomadhan',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

// Enable CORS for all origins
app.use(cors());

// Middleware to parse JSON request bodies
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});


// Serve admin.html if needed (adjust path if required)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

let pool;

async function getPool() {
  if (!pool) {
    pool = await sql.connect(config);
  }
  return pool;
}

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
    const incomeVal = parseFloat(income);
    
    console.log('Creating order with:', {
      customer_name,
      address,
      phone,
      serviceStr,
      status,
      parsedDate,
      assignedPersonStr,
      incomeVal
    });

    const pool = await getPool();
    const request = pool.request();
    request.input('customer_name', sql.NVarChar, customer_name);
    request.input('address', sql.NVarChar, address || '');
    request.input('phone', sql.NVarChar, phone || '');
    request.input('service', sql.NVarChar, serviceStr);
    request.input('status', sql.NVarChar, status);
    request.input('date', sql.Date, parsedDate);
    request.input('assigned_person', sql.NVarChar, assignedPersonStr);
    request.input('income', sql.Decimal(18, 2), isNaN(incomeVal) ? 0 : incomeVal);

    const insertQuery = `
      INSERT INTO ordermanagement
        (customer_name, address, phone, service, status, date, assigned_person, income)
      OUTPUT INSERTED.id
      VALUES
        (@customer_name, @address, @phone, @service, @status, @date, @assigned_person, @income);
    `;

    const result = await request.query(insertQuery);

    console.log('Insert result:', result);

    res.status(201).json({ message: 'Order created', id: result.recordset[0].id });
  } catch (err) {
    console.error('Insert error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});


// PUT update order by ID
app.put('/api/update_orders/:id', async (req, res) => {
  try {
    const id = req.params.id;
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

    const pool = await getPool();
    const request = pool.request();
    request.input('id', sql.Int, id);
    request.input('customer_name', sql.NVarChar, customer_name);
    request.input('address', sql.NVarChar, address || '');
    request.input('phone', sql.NVarChar, phone || '');
    request.input('service', sql.NVarChar, serviceStr);
    request.input('status', sql.NVarChar, status);
    request.input('date', sql.Date, date);
    request.input('assigned_person', sql.NVarChar, assignedPersonStr);
    request.input('income', sql.Decimal(18, 2), income || 0);

    const updateQuery = `
      UPDATE ordermanagement SET
        customer_name = @customer_name,
        address = @address,
        phone = @phone,
        service = @service,
        status = @status,
        date = @date,
        assigned_person = @assigned_person,
        income = @income
      WHERE id = @id;
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
app.delete('/api2/delete_orders/:id', async (req, res) => {
    console.log(`I am here`);
  try {
    const id = parseInt(req.params.id, 10);
    console.log(`Delete request for id: ${id} (type: ${typeof id})`);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const pool = await getPool();
    const request = pool.request();
    request.input('id', sql.Int, id);

    const result = await request.query('DELETE FROM ordermanagement WHERE id = @id');
    console.log('Delete result:', result);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ message: 'Order deleted' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});


app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
