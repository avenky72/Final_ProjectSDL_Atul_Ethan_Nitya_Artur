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
      console.error('Request body that failed:', req.body);
      throw new Error(`HTTP error! status: ${response.status}, ${error}`);
    }

    const responseText = await response.text();
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


// Update product for putting true image urls in
app.patch('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Updating product ${id}:`, req.body);
    
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
      throw new Error(`HTTP error! status: ${response.status}, ${error}`);
    }
    
    const updated = await response.json();
    res.json({
      message: 'Product updated successfully',
      product: updated[0] || req.body
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: error.message });
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

// Auth routes (optional - only load if dependencies are available)
try {
  const authRoutes = require('./routes/auth.routes');
  app.use('/api/auth', authRoutes);
  console.log('Auth routes loaded successfully');
} catch (error) {
  console.warn('Auth routes not loaded - some dependencies may be missing:', error.message);
  console.warn('Install dependencies with: npm install');
  // Add a basic auth endpoint that returns an error
  app.use('/api/auth', (req, res) => {
    res.status(503).json({ error: 'Authentication service not available. Please install dependencies: npm install' });
  });
}

// Closets routes (Supabase-based)
try {
  const SupabaseAuthController = require('./auth-supabase.controller');
  const authController = new SupabaseAuthController();

  // Middleware to require authentication for closets routes
  const requireAuth = (req, res, next) => authController.requireAuth(req, res, next);

  // Get all closets for logged-in user
  app.get('/api/closets', requireAuth, async (req, res) => {
    try {
      const userId = req.userId;
      
      // Fetch closets from Supabase
      const response = await fetch(`${SUPABASE_URL}/rest/v1/user_closets?user_id=eq.${userId}&select=*,outfits(count)`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      if (!response.ok) {
        throw new Error(`Supabase error: ${response.status}`);
      }

      const closets = await response.json();
      
      // Format response with outfit_count
      const formattedClosets = closets.map(closet => ({
        ...closet,
        outfit_count: closet.outfits?.[0]?.count || 0
      }));

      res.json({ closets: formattedClosets });
    } catch (error) {
      console.error('Error fetching closets:', error);
      res.status(500).json({ error: 'Failed to fetch closets' });
    }
  });

  // Get single closet with outfits
  app.get('/api/closets/:id', requireAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const { id } = req.params;

      // Get closet
      const closetResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_closets?id=eq.${id}&user_id=eq.${userId}`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      if (!closetResponse.ok) {
        return res.status(404).json({ error: 'Closet not found' });
      }

      const closets = await closetResponse.json();
      if (closets.length === 0) {
        return res.status(404).json({ error: 'Closet not found' });
      }

      // Get outfits
      const outfitsResponse = await fetch(`${SUPABASE_URL}/rest/v1/outfits?closet_id=eq.${id}&select=*,outfit_products(count)`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      const outfits = outfitsResponse.ok ? await outfitsResponse.json() : [];

      res.json({
        closet: closets[0],
        outfits: outfits.map(outfit => ({
          ...outfit,
          product_count: outfit.outfit_products?.[0]?.count || 0
        }))
      });
    } catch (error) {
      console.error('Error fetching closet:', error);
      res.status(500).json({ error: 'Failed to fetch closet' });
    }
  });

  // Create new closet
  app.post('/api/closets', requireAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const { name, description, is_public, cover_image } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Closet name is required' });
      }

      const response = await fetch(`${SUPABASE_URL}/rest/v1/user_closets`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          user_id: userId,
          name: name,
          description: description || null,
          is_public: is_public || false,
          cover_image: cover_image || null
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Supabase error:', error);
        return res.status(500).json({ error: 'Failed to create closet' });
      }

      const closet = await response.json();
      res.status(201).json({ closet: Array.isArray(closet) ? closet[0] : closet });
    } catch (error) {
      console.error('Error creating closet:', error);
      res.status(500).json({ error: 'Failed to create closet' });
    }
  });

  // Add product to closet (uses closet_products table directly)
  app.post('/api/closets/:closetId/add-product', requireAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const { closetId } = req.params;
      const { product_id } = req.body;

      if (!product_id) {
        return res.status(400).json({ error: 'Product ID is required' });
      }

      // Check if closet exists and belongs to user
      const closetCheck = await fetch(`${SUPABASE_URL}/rest/v1/user_closets?id=eq.${closetId}&user_id=eq.${userId}`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      const closets = await closetCheck.json();
      if (closets.length === 0) {
        return res.status(404).json({ error: 'Closet not found' });
      }

      // Add product directly to closet using closet_products table
      const addProduct = await fetch(`${SUPABASE_URL}/rest/v1/closet_products`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          closet_id: closetId,
          product_id: product_id
        })
      });

      if (!addProduct.ok) {
        const error = await addProduct.text();
        // If product already exists (409 conflict), that's okay
        if (addProduct.status === 409) {
          return res.json({ success: true, message: 'Product already in closet' });
        }
        console.error('Error adding product:', error);
        return res.status(500).json({ error: 'Failed to add product to closet' });
      }

      res.json({ success: true, message: 'Product added to closet' });
    } catch (error) {
      console.error('Error adding product to closet:', error);
      res.status(500).json({ error: 'Failed to add product to closet' });
    }
  });

  // Like/Unlike product
  app.post('/api/products/:id/like', requireAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const { id } = req.params;

      // Check if like already exists
      const checkLike = await fetch(`${SUPABASE_URL}/rest/v1/user_favorites?user_id=eq.${userId}&product_id=eq.${id}`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      const existing = await checkLike.json();
      
      if (existing.length > 0) {
        return res.json({ liked: true, message: 'Already liked' });
      }

      // Create like
      const response = await fetch(`${SUPABASE_URL}/rest/v1/user_favorites`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          user_id: userId,
          product_id: id
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Error creating like:', error);
        return res.status(500).json({ error: 'Failed to like product' });
      }

      res.json({ liked: true, message: 'Product liked' });
    } catch (error) {
      console.error('Error liking product:', error);
      res.status(500).json({ error: 'Failed to like product' });
    }
  });

  // Unlike product
  app.delete('/api/products/:id/like', requireAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const { id } = req.params;

      const response = await fetch(`${SUPABASE_URL}/rest/v1/user_favorites?user_id=eq.${userId}&product_id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      if (!response.ok) {
        return res.status(500).json({ error: 'Failed to unlike product' });
      }

      res.json({ liked: false, message: 'Product unliked' });
    } catch (error) {
      console.error('Error unliking product:', error);
      res.status(500).json({ error: 'Failed to unlike product' });
    }
  });

  // Check if product is liked
  app.get('/api/products/:id/liked', requireAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const { id } = req.params;

      const response = await fetch(`${SUPABASE_URL}/rest/v1/user_favorites?user_id=eq.${userId}&product_id=eq.${id}`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      if (!response.ok) {
        return res.json({ liked: false });
      }

      const likes = await response.json();
      res.json({ liked: likes.length > 0 });
    } catch (error) {
      console.error('Error checking like status:', error);
      res.json({ liked: false });
    }
  });

  console.log('Closets and likes routes loaded successfully');
} catch (error) {
  console.warn('Closets routes not loaded:', error.message);
}

app.listen(port, () => {
  console.log(`CMS API server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`Products API: http://localhost:${port}/api/products`);
  console.log(`Auth API: http://localhost:${port}/api/auth`);
});