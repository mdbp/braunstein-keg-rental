export default async function handler(req, res) {
  const shopifyUrl = process.env.SHOPIFY_STORE_URL;
  const token = process.env.SHOPIFY_ACCESS_TOKEN;
  
  // Hvis ingen Shopify credentials, returner test data
  if (!shopifyUrl || !token) {
    const testOrders = [
      {
        id: '1001',
        orderNumber: '#1001',
        customer: 'Copenhagen Restaurant',
        status: 'pending',
        rentalStartDate: '2025-09-12',
        rentalEndDate: '2025-09-19'
      }
    ];
    return res.status(200).json(testOrders);
  }
  
  // Hent fra Shopify
  try {
    const response = await fetch(
      `https://${shopifyUrl}/admin/api/2024-01/orders.json?status=any`,
      {
        headers: {
          'X-Shopify-Access-Token': token,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    
    // Transform Shopify orders til dit format
    const orders = data.orders?.map(order => ({
      id: order.id.toString(),
      orderNumber: `#${order.order_number}`,
      customer: order.customer?.default_address?.name || 'Guest',
      status: 'pending',
      total: order.total_price,
      items: order.line_items?.length || 0,
      createdAt: order.created_at
    })) || [];
    
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
