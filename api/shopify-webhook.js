// Temporary storage (brug database i produktion)
let shopifyOrders = [];
let shopifyCustomers = [];

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parse Shopify webhook
  const { 
    id,
    order_number,
    email,
    customer,
    line_items,
    shipping_address,
    billing_address,
    created_at,
    note,
    total_price
  } = req.body;

  // Gem/opdater kunde
  if (customer) {
    const existingCustomer = shopifyCustomers.find(c => c.email === customer.email);
    
    if (!existingCustomer) {
      shopifyCustomers.push({
        id: 'SHOP-CUST-' + customer.id,
        shopifyId: customer.id,
        name: `${customer.first_name} ${customer.last_name}`,
        email: customer.email,
        phone: customer.phone || shipping_address?.phone || '',
        address: shipping_address ? 
          `${shipping_address.address1}, ${shipping_address.zip} ${shipping_address.city}` : '',
        totalOrders: 1,
        totalSpent: parseFloat(total_price),
        status: 'active',
        source: 'shopify',
        createdAt: customer.created_at
      });
    } else {
      existingCustomer.totalOrders += 1;
      existingCustomer.totalSpent += parseFloat(total_price);
    }
  }

  // Gem ordre
  const newOrder = {
    id: 'SHOP-' + id,
    shopifyId: id,
    orderNumber: '#' + order_number,
    customer: customer ? `${customer.first_name} ${customer.last_name}` : 'Guest',
    customerEmail: email,
    customerPhone: customer?.phone || shipping_address?.phone || '',
    status: 'pending',
    priority: 'høj',
    deliveryDate: new Date(Date.now() + 86400000).toISOString(),
    items: line_items?.map(item => ({
      id: item.id,
      sku: item.sku,
      name: item.title,
      quantity: item.quantity,
      price: item.price
    })) || [],
    totalPrice: total_price,
    shippingAddress: shipping_address,
    billingAddress: billing_address,
    notes: note || 'Shopify ordre',
    source: 'shopify',
    createdAt: created_at
  };

  shopifyOrders.push(newOrder);

  // Log for debugging
  console.log('Shopify webhook received:', {
    orderId: newOrder.id,
    customer: newOrder.customer,
    items: newOrder.items.length
  });

  res.status(200).json({ 
    success: true,
    orderId: newOrder.id,
    message: 'Order and customer synced'
  });
}

// Export for andre endpoints
export { shopifyOrders, shopifyCustomers };
