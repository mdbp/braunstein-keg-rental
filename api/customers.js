export default function handler(req, res) {
  const customers = [
    {id: 'CUST001', name: 'Copenhagen Restaurant', email: 'info@copenhagen-restaurant.dk', phone: '+45 33 12 45 67', status: 'active'},
    {id: 'CUST002', name: 'Bar Brewhouse', email: 'contact@brewhouse.dk', phone: '+45 26 78 90 12', status: 'active'}
  ];
  res.status(200).json(customers);
}
