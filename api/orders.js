let orders = [
  {
    id: '1001',
    orderNumber: '#1001',
    customer: 'Copenhagen Restaurant',
    status: 'pending',
    rentalStartDate: '2025-09-12',
    rentalEndDate: '2025-09-19'
  }
];

export default function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json(orders);
  }
  
  if (req.method === 'POST') {
    const newOrder = {
      id: Date.now().toString(),
      orderNumber: '#' + (1000 + orders.length + 1),
      status: 'pending',
      ...req.body
    };
    orders.push(newOrder);
    return res.status(201).json(newOrder);
  }
  
  res.status(405).json({ error: 'Method not allowed' });
}
