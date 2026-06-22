import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

  try {
    // Gem/opdater kunde
    if (customer) {
      await sql`
        INSERT INTO customers (shopify_id, name, email, phone, address, total_spent, total_orders, created_at)
        VALUES (
          ${customer.id},
          ${`${customer.first_name} ${customer.last_name}`},
          ${customer.email},
          ${customer.phone || shipping_address?.phone || ''},
          ${shipping_address ? `${shipping_address.address1}, ${shipping_address.zip} ${shipping_address.city}` : ''},
          ${parseFloat(total_price)},
          1,
          ${customer.created_at}
        )
        ON CONFLICT (shopify_id) DO UPDATE SET
          total_orders = customers.total_orders + 1,
          total_spent = customers.total_spent + ${parseFloat(total_price)}
      `;
    }

    // Gem ordre
    const items = line_items?.map(item => ({
      id: item.id,
      sku: item.sku,
      name: item.title,
      quantity: item.quantity,
      price: item.price
    })) || [];

    await sql`
      INSERT INTO orders (
        shopify_id, order_number, customer_name, customer_email, customer_phone,
        status, priority, delivery_date, items, total_price,
        shipping_address, billing_address, notes, source, created_at
      )
      VALUES (
        ${id},
        ${'#' + order_number},
        ${customer ? `${customer.first_name} ${customer.last_name}` : 'Guest'},
        ${email},
        ${customer?.phone || shipping_address?.phone || ''},
        'pending',
        'høj',
        ${new Date(Date.now() + 86400000).toISOString()},
        ${JSON.stringify(items)},
        ${total_price},
        ${JSON.stringify(shipping_address)},
        ${JSON.stringify(billing_address)},
        ${note || 'Shopify ordre'},
        'shopify',
        ${created_at}
      )
      ON CONFLICT (shopify_id) DO NOTHING
    `;

    console.log('Shopify webhook received:', { orderId: id });

    res.status(200).json({
      success: true,
      orderId: 'SHOP-' + id,
      message: 'Order and customer synced'
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: error.message });
  }
}
