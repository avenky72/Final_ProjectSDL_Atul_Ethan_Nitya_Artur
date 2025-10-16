const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Supabase REST API configuration
const SUPABASE_URL = 'https://qqenztbtabitcxyilktl.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY; // You'll need to get this

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    api: 'REST API mode'
  });
});

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const products = await response.json();
    res.json({
      products: products,
      pagination: {
        page: 1,
        limit: products.length,
        total: products.length,
        pages: 1
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Create product
app.post('/api/products', async (req, res) => {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/products`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });
    
    if (!response.ok) {
        const error = await response.text();
        console.error('Supabase error:', error);
        throw new Error(`HTTP error! status: ${response.status}, ${error}`);
    }

    const responseText = await response.text()
    console.log('Supabase response status:', response.status);
    console.log('Supabase response text:', responseText);

    // Supabase returns empty response on successful POST, which is normal
    let responseProduct = req.body; // Return what we sent as confirmation

    // If there is a response, try to parse it
    if (responseText) {
        try {
            const product = JSON.parse(responseText);
            if (Array.isArray(product) && product.length > 0) {
                responseProduct = product[0];
            } else if (product && typeof product === 'object') {
                responseProduct = product;
            }
        } catch (parseError) {
            console.log('Could not parse response, using request body');
        }
    }

    res.status(201).json({
        message: 'Product uploaded successfully',
        product: responseProduct
    })
    
} catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({error: error.message});
    }
})

app.listen(port, () => {
  console.log(`CMS API server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`Products API: http://localhost:${port}/api/products`);
});