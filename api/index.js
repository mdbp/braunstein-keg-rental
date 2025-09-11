const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

let orders = [
  {
    id: '1001',
    orderNumber: '#1001',
    customer: 'Copenhagen Restaurant',
    status: 'pending'
  }
];

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/orders', (req, res) => {
  res.json(orders);
});

app.post('/api/orders', (req, res) => {
  const newOrder = {
    id: Date.now().toString(),
    orderNumber: '#' + (1000 + orders.length + 1),
    ...req.body
  };
  orders.push(newOrder);
  res.status(201).json(newOrder);
});

module.exports = app;
