export default function handler(req, res) {
  res.status(200).json([
    { id: 'EMP001', name: 'Michael Poulsen' },
    { id: 'EMP002', name: 'Claus Braunstein' },
    { id: 'EMP003', name: 'Thomas Andersen' }
  ]);
}
