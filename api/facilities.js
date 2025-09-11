export default function handler(req, res) {
  res.status(200).json([
    { id: 'ANL-001', name: 'Anlæg 001', status: 'active' },
    { id: 'ANL-002', name: 'Anlæg 002', status: 'active' },
    { id: 'ANL-003', name: 'Anlæg 003', status: 'maintenance' }
  ]);
}
