import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  const shopifyUrl = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ACCESS_TOKEN;

  if (!shopifyUrl || !token) {
    return res.status(200).json({
      error: 'Shopify not configured',
      message: 'Add SHOPIFY_STORE_DOMAIN and SHOPIFY_ACCESS_TOKEN to environment variables'
    });
  }

  const fromDate = req.query.from || '2026-01-01';
  let allOrders = [];
  let nextPageInfo = null;
  let pageCount = 0;
  const maxPages = 20;

  try {
    do {
      const params = new URLSearchParams({
        status: 'any',
        limit: '250'
      });

      if (nextPageInfo) {
        params.set('page_info', nextPageInfo);
      } else {
        params.set('created_at_min', `${fromDate}T00:00:00Z`);
      }

      const response = await fetch(
        `https://${shopifyUrl}/admin/api/2025-01/orders.json?${params}`,
        { headers: { 'X-Shopify-Access-Token': token } }
      );

      if (!response.ok) {
        throw new Error(`Shopify API fejl: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      allOrders = allOrders.concat(data.orders || []);
      pageCount++;

      const linkHeader = response.headers.get('Link');
      nextPageInfo = null;
      if (linkHeader && linkHeader.includes('rel="next"')) {
        const match = linkHeader.match(/page_info=([^&>]+).*rel="next"/);
        if (match) nextPageInfo = match[1];
      }
    } while (nextPageInfo && pageCount < maxPages);

    let savedCount = 0;
    let skippedCount = 0;

    for (const order of allOrders) {
      const customer = order.customer;
      const shipping = order.shipping_address;
      const billing = order.billing_address;

      try {
        if (customer) {
          await sql`
            INSERT INTO customers (shopify_id, name, email, phone, address, total_spent, total_orders, created_at)
            VALUES (
              ${customer.id},
              ${`${customer.first_name || ''} ${customer.last_name || ''}`.trim()},
              ${customer.email || order.email},
              ${customer.phone || shipping?.phone || ''},
              ${shipping ? `${shipping.address1}, ${shipping.zip} ${shipping.city}` : ''},
              ${parseFloat(order.total_price || 0)},
              1,
              ${customer.created_at}
            )
            ON CONFLICT (shopify_id) DO UPDATE SET
              total_orders = customers.total_orders + 1,
              total_spent = customers.total_spent + ${parseFloat(order.total_price || 0)}
          `;
        }

        const items = order.line_items?.map(item => ({
          id: item.id,
          sku: item.sku,
          name: item.title,
          quantity: item.quantity,
          price: item.price
        })) || [];

        const result = await sql`
          INSERT INTO orders (
            shopify_id, order_number, customer_name, customer_email, customer_phone,
            status, priority, delivery_date, items, total_price,
            shipping_address, billing_address, notes, source, created_at
          )
          VALUES (
            ${order.id},
            ${'#' + order.order_number},
            ${customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : 'Guest'},
            ${order.email},
            ${customer?.phone || shipping?.phone || ''},
            'pending',
            'normal',
            ${new Date(Date.now() + 86400000).toISOString()},
            ${JSON.stringify(items)},
            ${order.total_price},
            ${JSON.stringify(shipping)},
            ${JSON.stringify(billing)},
            ${order.note || 'Shopify ordre (historisk sync)'},
            'shopify',
            ${order.created_at}
          )
          ON CONFLICT (shopify_id) DO NOTHING
          RETURNING id
        `;

        if (result.length > 0) {
          savedCount++;
        } else {
          skippedCount++;
        }
      } catch (innerError) {
        console.error(`Fejl ved gemning af ordre ${order.id}:`, innerError.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Synkronisering færdig fra ${fromDate}`,
      totalFetched: allOrders.length,
      saved: savedCount,
      alreadyExisted: skippedCount,
      pagesProcessed: pageCount
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
