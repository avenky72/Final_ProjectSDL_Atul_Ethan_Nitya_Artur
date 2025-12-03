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

      // Get outfits for this closet, ordered by created_at desc
      const outfitsResponse = await fetch(`${SUPABASE_URL}/rest/v1/outfits?closet_id=eq.${id}&order=created_at.desc`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      let outfits = [];
      if (outfitsResponse.ok) {
        outfits = await outfitsResponse.json();
        console.log(`Found ${outfits.length} outfits for closet ${id}`);
        
      // Get product count and preview images for each outfit (more efficient: batch query)
      const outfitIds = outfits.map(o => o.id);
      if (outfitIds.length > 0) {
        const idsParam = outfitIds.join(',');
        // Get outfit products with product images
        const productsResponse = await fetch(`${SUPABASE_URL}/rest/v1/outfit_products?outfit_id=in.(${idsParam})&select=outfit_id,products(images,id)&order=position.asc`, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        });
        
        if (productsResponse.ok) {
          const allProducts = await productsResponse.json();
          // Group by outfit and get first 4 images
          const outfitData = {};
          if (Array.isArray(allProducts)) {
            allProducts.forEach(op => {
              if (!outfitData[op.outfit_id]) {
                outfitData[op.outfit_id] = { count: 0, images: [] };
              }
              outfitData[op.outfit_id].count++;
              // Get first image from product if available
              if (op.products && op.products.images && Array.isArray(op.products.images) && op.products.images.length > 0) {
                if (outfitData[op.outfit_id].images.length < 4) {
                  outfitData[op.outfit_id].images.push(op.products.images[0]);
                }
              }
            });
          }
          // Assign counts and preview images
          outfits.forEach(outfit => {
            outfit.product_count = outfitData[outfit.id]?.count || 0;
            outfit.preview_images = outfitData[outfit.id]?.images || [];
          });
          console.log('Outfit data:', outfitData);
        } else {
          const errorText = await productsResponse.text();
          console.error('Error fetching outfit product data:', errorText);
          outfits.forEach(outfit => {
            outfit.product_count = 0;
            outfit.preview_images = [];
          });
        }
      } else {
        outfits.forEach(outfit => {
          outfit.product_count = 0;
          outfit.preview_images = [];
        });
      }
      } else {
        const errorText = await outfitsResponse.text();
        console.error('Error fetching outfits:', errorText);
      }

      res.json({
        closet: closets[0],
        outfits: outfits
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
        const errorText = await response.text();
        console.error('Supabase error creating closet:', errorText);
        console.error('Request body:', JSON.stringify({ user_id: userId, name, description, is_public, cover_image }));
        return res.status(response.status).json({ error: `Failed to create closet: ${errorText}` });
      }

      const closet = await response.json();
      const createdCloset = Array.isArray(closet) ? closet[0] : closet;
      console.log('Closet created successfully:', createdCloset);
      res.status(201).json({ closet: createdCloset });
    } catch (error) {
      console.error('Error creating closet:', error);
      res.status(500).json({ error: 'Failed to create closet' });
    }
  });

  // Delete closet
  app.delete('/api/closets/:id', requireAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const { id } = req.params;

      // Verify closet belongs to user
      const closetCheck = await fetch(`${SUPABASE_URL}/rest/v1/user_closets?id=eq.${id}&user_id=eq.${userId}`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      const closets = await closetCheck.json();
      if (closets.length === 0) {
        return res.status(404).json({ error: 'Closet not found' });
      }

      // Delete closet (cascade should handle outfits and outfit_products)
      const deleteResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_closets?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
        console.error('Error deleting closet:', errorText);
        return res.status(500).json({ error: 'Failed to delete closet' });
      }

      res.json({ success: true, message: 'Closet deleted successfully' });
    } catch (error) {
      console.error('Error deleting closet:', error);
      res.status(500).json({ error: 'Failed to delete closet' });
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

  // Get all liked products for user
  app.get('/api/products/liked', requireAuth, async (req, res) => {
    try {
      const userId = req.userId;
      console.log('Fetching liked products for user:', userId);

      // First get the favorite product IDs
      const favoritesResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_favorites?user_id=eq.${userId}&select=product_id`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      if (!favoritesResponse.ok) {
        const errorText = await favoritesResponse.text();
        console.error('Error fetching favorites:', errorText);
        console.error('Response status:', favoritesResponse.status);
        return res.status(500).json({ error: 'Failed to fetch liked products', details: errorText });
      }

      const favorites = await favoritesResponse.json();
      console.log('Favorites found:', favorites.length);
      
      if (!Array.isArray(favorites)) {
        console.error('Favorites is not an array:', favorites);
        return res.json({ products: [] });
      }
      
      if (favorites.length === 0) {
        return res.json({ products: [] });
      }

      // Extract product IDs
      const productIds = favorites.map(fav => fav.product_id).filter(id => id != null);
      console.log('Product IDs to fetch:', productIds.length);
      
      if (productIds.length === 0) {
        return res.json({ products: [] });
      }

      // Fetch products - try different approaches based on count
      if (productIds.length === 1) {
        // Single product - use simple eq
        const url = `${SUPABASE_URL}/rest/v1/products?id=eq.${productIds[0]}`;
        try {
          const productsResponse = await fetch(url, {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
          });
          
          if (productsResponse.ok) {
            const products = await productsResponse.json();
            return res.json({ products: Array.isArray(products) ? products : [] });
          } else {
            const errorText = await productsResponse.text();
            console.error('Error fetching single product:', errorText);
            // Return empty array instead of error - product might have been deleted
            return res.json({ products: [] });
          }
        } catch (err) {
          console.error('Exception fetching single product:', err);
          return res.json({ products: [] });
        }
      } else if (productIds.length <= 50) {
        // For smaller lists, fetch individually (more reliable)
        const products = [];
        for (const productId of productIds) {
          try {
            const singleResponse = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${productId}`, {
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
              }
            });
            if (singleResponse.ok) {
              const productData = await singleResponse.json();
              // Supabase returns an array even for single queries
              const product = Array.isArray(productData) ? productData[0] : productData;
              if (product && product.id) products.push(product);
            } else {
              const errorText = await singleResponse.text();
              console.error(`Error fetching product ${productId}:`, errorText);
            }
          } catch (err) {
            console.error(`Error fetching product ${productId}:`, err);
          }
        }
        return res.json({ products });
      } else {
        // For larger lists, try using CSV format with 'in' operator
        // PostgREST supports: id=in.(1,2,3)
        const idsParam = productIds.join(',');
        const url = `${SUPABASE_URL}/rest/v1/products?id=in.(${idsParam})`;
        
        console.log('Fetching liked products (batch), URL length:', url.length);
        
        const productsResponse = await fetch(url, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        });

        if (!productsResponse.ok) {
          const errorText = await productsResponse.text();
          console.error('Error fetching products (batch):', errorText);
          console.error('Product IDs count:', productIds.length);
          
          // Fallback to individual fetches for first 50
          console.log('Falling back to individual fetches...');
          const products = [];
          for (const productId of productIds.slice(0, 50)) {
            try {
              const singleResponse = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${productId}`, {
                headers: {
                  'apikey': SUPABASE_ANON_KEY,
                  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
              });
              if (singleResponse.ok) {
                const [product] = await singleResponse.json();
                if (product) products.push(product);
              }
            } catch (err) {
              console.error(`Error fetching product ${productId}:`, err);
            }
          }
          return res.json({ products });
        }

        const products = await productsResponse.json();
        res.json({ products: Array.isArray(products) ? products : [] });
      }
    } catch (error) {
      console.error('Error fetching liked products:', error);
      res.status(500).json({ error: 'Failed to fetch liked products' });
    }
  });

  // Create new outfit
  app.post('/api/closets/:closetId/outfits', requireAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const { closetId } = req.params;
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Outfit name is required' });
      }

      // Verify closet belongs to user
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

      // Create outfit
      const response = await fetch(`${SUPABASE_URL}/rest/v1/outfits`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          user_id: userId,
          closet_id: closetId,
          name: name,
          description: description || null
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error creating outfit:', errorText);
        return res.status(500).json({ error: 'Failed to create outfit' });
      }

      const outfit = await response.json();
      res.status(201).json({ outfit: Array.isArray(outfit) ? outfit[0] : outfit });
    } catch (error) {
      console.error('Error creating outfit:', error);
      res.status(500).json({ error: 'Failed to create outfit' });
    }
  });

  // Get outfit with products (sorted by category)
  app.get('/api/closets/:closetId/outfits/:outfitId', requireAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const { closetId, outfitId } = req.params;

      // Verify outfit belongs to user's closet
      const outfitResponse = await fetch(`${SUPABASE_URL}/rest/v1/outfits?id=eq.${outfitId}&closet_id=eq.${closetId}`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      const outfits = await outfitResponse.json();
      if (outfits.length === 0) {
        return res.status(404).json({ error: 'Outfit not found' });
      }

      // Verify closet belongs to user
      const closetCheck = await fetch(`${SUPABASE_URL}/rest/v1/user_closets?id=eq.${closetId}&user_id=eq.${userId}`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      const closets = await closetCheck.json();
      if (closets.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get products in this outfit - fetch outfit_products first, then get products
      const outfitProductsResponse = await fetch(`${SUPABASE_URL}/rest/v1/outfit_products?outfit_id=eq.${outfitId}&select=product_id,position&order=position.asc`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      let products = [];
      if (outfitProductsResponse.ok) {
        const outfitProducts = await outfitProductsResponse.json();
        const productIds = outfitProducts.map(op => op.product_id).filter(id => id != null);
        
        if (productIds.length > 0) {
          // Fetch products with their categories and brands
          const idsParam = productIds.join(',');
          const productsResponse = await fetch(`${SUPABASE_URL}/rest/v1/products?id=in.(${idsParam})&select=*,brands(name),categories(name)`, {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
          });

          if (productsResponse.ok) {
            const fetchedProducts = await productsResponse.json();
            const productsMap = {};
            fetchedProducts.forEach(p => {
              productsMap[p.id] = {
                ...p,
                brand_name: p.brands?.name,
                category_name: p.categories?.name
              };
            });

            // Reconstruct products in order with position
            products = outfitProducts
              .map(op => {
                const product = productsMap[op.product_id];
                if (product) {
                  return {
                    ...product,
                    position: op.position
                  };
                }
                return null;
              })
              .filter(p => p != null);

            // Sort by category: Tops(1) -> Bottoms(2) -> Shoes(3) -> Accessories(4) -> Outerwear(5) -> Dresses(6) -> Bags(7) -> Jewelry(8)
            const categoryOrder = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8 };
            products.sort((a, b) => {
              const aCat = a.category_id ? (categoryOrder[a.category_id] || 999) : 999;
              const bCat = b.category_id ? (categoryOrder[b.category_id] || 999) : 999;
              if (aCat !== bCat) return aCat - bCat;
              return (a.position || 0) - (b.position || 0);
            });
          }
        }
      }

      res.json({
        outfit: outfits[0],
        products: products
      });
    } catch (error) {
      console.error('Error fetching outfit:', error);
      res.status(500).json({ error: 'Failed to fetch outfit' });
    }
  });

  // Delete outfit
  app.delete('/api/closets/:closetId/outfits/:outfitId', requireAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const { closetId, outfitId } = req.params;

      // Verify outfit belongs to user's closet
      const outfitCheck = await fetch(`${SUPABASE_URL}/rest/v1/outfits?id=eq.${outfitId}&closet_id=eq.${closetId}`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      const outfits = await outfitCheck.json();
      if (outfits.length === 0) {
        return res.status(404).json({ error: 'Outfit not found' });
      }

      // Verify closet belongs to user
      const closetCheck = await fetch(`${SUPABASE_URL}/rest/v1/user_closets?id=eq.${closetId}&user_id=eq.${userId}`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      const closets = await closetCheck.json();
      if (closets.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Delete outfit (cascade should handle outfit_products)
      const deleteResponse = await fetch(`${SUPABASE_URL}/rest/v1/outfits?id=eq.${outfitId}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
        console.error('Error deleting outfit:', errorText);
        return res.status(500).json({ error: 'Failed to delete outfit' });
      }

      res.json({ success: true, message: 'Outfit deleted successfully' });
    } catch (error) {
      console.error('Error deleting outfit:', error);
      res.status(500).json({ error: 'Failed to delete outfit' });
    }
  });

  // Add product to outfit
  app.post('/api/closets/:closetId/outfits/:outfitId/products', requireAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const { closetId, outfitId } = req.params;
      const { product_id, position } = req.body;

      if (!product_id) {
        return res.status(400).json({ error: 'Product ID is required' });
      }

      // Verify outfit belongs to user's closet
      const outfitCheck = await fetch(`${SUPABASE_URL}/rest/v1/outfits?id=eq.${outfitId}&closet_id=eq.${closetId}`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      const outfits = await outfitCheck.json();
      if (outfits.length === 0) {
        return res.status(404).json({ error: 'Outfit not found' });
      }

      // Verify closet belongs to user
      const closetCheck = await fetch(`${SUPABASE_URL}/rest/v1/user_closets?id=eq.${closetId}&user_id=eq.${userId}`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      const closets = await closetCheck.json();
      if (closets.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Add product to outfit
      const response = await fetch(`${SUPABASE_URL}/rest/v1/outfit_products`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          outfit_id: outfitId,
          product_id: product_id,
          position: position || 0
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        // If product already exists (409 conflict), that's okay
        if (response.status === 409) {
          return res.json({ success: true, message: 'Product already in outfit' });
        }
        console.error('Error adding product to outfit:', errorText);
        return res.status(500).json({ error: 'Failed to add product to outfit' });
      }

      res.json({ success: true, message: 'Product added to outfit' });
    } catch (error) {
      console.error('Error adding product to outfit:', error);
      res.status(500).json({ error: 'Failed to add product to outfit' });
    }
  });

  console.log('Closets, likes, and outfits routes loaded successfully');
} catch (error) {
  console.error('Closets routes not loaded:', error);
  console.error('Error stack:', error.stack);
}

app.listen(port, () => {
  console.log(`CMS API server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`Products API: http://localhost:${port}/api/products`);
  console.log(`Auth API: http://localhost:${port}/api/auth`);
});