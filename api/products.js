export default function handler(req, res) {
  const products = [
    {id: 'PROD001', sku: 'BR-IPA-20L', name: 'Braunstein IPA 20L', price: 850, stock: 15},
    {id: 'PROD002', sku: 'BR-PILS-20L', name: 'Braunstein Pilsner 20L', price: 750, stock: 20}
  ];
  res.status(200).json(products);
}
