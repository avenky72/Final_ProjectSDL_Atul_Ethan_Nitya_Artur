const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;


const SUPABASE_URL = 'https://qqenztbtabitcxyilktl.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY; // From your .env file


app.use(cors());
app.use(express.json({ limit: '10mb' }));


app.get('/health', (req, res) => {
  res.json({ 

    status: 'OK', 
    timestamp: new Date().toISOString(),
    api: 'REST API mode'

  });
});



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

      const errorText = await response.text();
      console.error('Supabase error:', errorText);
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
  } 
  
  catch (error) {
    console.error('Error fetching products:', error.message);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});


app.post('/api/products', async (req, res) => {

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/products`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation' // This tells Supabase to return the created object
      },

      body: JSON.stringify(req.body)
    });
    
    if (!response.ok) {

      const error = await response.text();
      console.error('Supabase error:', error);
      throw new Error(`HTTP error! status: ${response.status}, ${error}`);
    }



    const responseText = await response.text();
    console.log('Supabase response status:', response.status);
    console.log('Supabase response text:', responseText);


    
    let responseProduct = req.body; 


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
    });
    
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: error.message });
  }
});


app.get('/api/products/:id', async (req, res) => {

  try {
    const { id } = req.params;
    const response = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${id}`, {
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
    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });

    }
    
    res.json(products[0]);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});


app.put('/api/products/:id', async (req, res) => {

  try {
    const { id } = req.params;
    const response = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(req.body)
    });
    

    if (!response.ok) {
      const error = await response.text();
      console.error('Supabase error:', error);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    

    const updated = await response.json();
    res.json({
      message: 'Product updated successfully',
      product: updated[0] || req.body
    });


  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});


app.delete('/api/products/:id', async (req, res) => {

  try {
    const { id } = req.params;
    const response = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${id}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    res.json({ message: 'Product deleted successfully' });

  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});


app.listen(port, () => {
  console.log(`CMS API server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`Products API: http://localhost:${port}/api/products`);
});