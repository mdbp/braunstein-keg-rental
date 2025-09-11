export default async function handler(req, res) {
  // CORS headers for at tillade requests fra din app
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  
  const { method, query } = req;
  
  // Shopify credentials fra environment variables
  const shopDomain = process.env.SHOPIFY_DOMAIN;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
  
  if (!shopDomain || !accessToken) {
    return res.status(500).json({ error: 'Shopify credentials mangler' });
  }
  
  if (method === 'GET' && query.action === 'orders') {
    try {
      const response = await fetch(
        `https://${shopDomain}/admin/api/2024-01/orders.json?status=any&limit=50`,
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const data = await response.json();
      
      // Filtrer og formater ordre
      const rentalOrders = data.orders
        .filter(order => 
          order.line_items.some(item => 
            item.title?.toLowerCase().includes('fadøl') || 
            item.title?.toLowerCase().includes('keg') ||
            item.title?.toLowerCase().includes('anlæg') ||
            item.sku?.includes('KEG') ||
            item.sku?.includes('FAD')
          )
        )
        .map(order => ({
          id: `shopify_${order.id}`,
          orderNumber: `#${order.order_number}`,
          customer: `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim() || 'Gæst',
          customerPhone: order.customer?.phone || order.billing_address?.phone || 'Ingen telefon',
          status: 'pending',
          priority: 'normal',
          deliveryDate: new Date(order.created_at).toLocaleDateString('da-DK'),
          rentalStartDate: new Date(order.created_at).toLocaleDateString('da-DK'),
          rentalEndDate: new Date(new Date(order.created_at).setDate(new Date(order.created_at).getDate() + 7)).toLocaleDateString('da-DK'),
          items: order.line_items
            .filter(item => 
              item.title?.toLowerCase().includes('fadøl') || 
              item.title?.toLowerCase().includes('keg') ||
              item.title?.toLowerCase().includes('anlæg')
            )
            .map(item => ({
              id: item.id.toString(),
              name: item.title,
              quantity: item.quantity,
              picked: 0
            })),
          totalItems: order.line_items.length,
          notes: order.note || '',
          customerSignature: null
        }));
      
      res.status(200).json({ success: true, orders: rentalOrders });
    } catch (error) {
      console.error('Shopify API fejl:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
