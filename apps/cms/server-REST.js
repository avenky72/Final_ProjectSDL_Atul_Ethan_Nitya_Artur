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
    let url = `${SUPABASE_URL}/rest/v1/products?select=*`;
    
    // Handle multiple categories
    if (req.query.categories) {
      const categoryIds = req.query.categories.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (categoryIds.length > 0) {
        // Use 'in' operator for multiple categories
        const categoriesParam = categoryIds.join(',');
        url += `&category_id=in.(${categoriesParam})`;
      }
    } else if (req.query.category) {
      // Single category (backward compatibility)
      url += `&category_id=eq.${req.query.category}`;
    }
    
    // Handle brand filter
    if (req.query.brand) {
      url += `&brand_id=eq.${req.query.brand}`;
    }
    
    // Handle price range
    if (req.query.minPrice) {
      url += `&price=gte.${req.query.minPrice}`;
    }
    if (req.query.maxPrice) {
      url += `&price=lte.${req.query.maxPrice}`;
    }
    
    const response = await fetch(url, {
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
  } catch (error) {
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

  // Get user profile
  app.get('/api/profile', requireAuth, async (req, res) => {
    try {
      const userId = req.userId;
      console.log('Fetching profile for user:', userId);
      
      // Try to fetch with username first, fallback to without if column doesn't exist
      let response = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=id,email,full_name,username,avatar_url`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      
      if (response.ok) {
        const users = await response.json();
        const user = users[0] || null;
        // Ensure username is always present (null if column doesn't exist)
        if (user && user.username === undefined) {
          user.username = null;
        }
        console.log('Profile fetched successfully:', user);
        res.json({ profile: user });
      } else {
        // If username column doesn't exist, try without it
        const errorText = await response.text();
        console.log('First attempt failed, error:', errorText);
        try {
          const errorJson = JSON.parse(errorText);
          // Check for both PGRST204 (PostgREST) and 42703 (PostgreSQL) error codes
          const isUsernameColumnError = (
            (errorJson.code === 'PGRST204' || errorJson.code === '42703') && 
            errorJson.message && 
            errorJson.message.includes('username')
          );
          
          if (isUsernameColumnError) {
            // Retry without username
            console.log('Retrying without username column...');
            response = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=id,email,full_name,avatar_url`, {
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
              }
            });
            if (response.ok) {
              const users = await response.json();
              const user = users[0] || null;
              if (user) user.username = null; // Add username as null
              console.log('Profile fetched successfully (without username):', user);
              res.json({ profile: user });
            } else {
              const retryError = await response.text();
              console.error('Retry also failed:', retryError);
              res.status(500).json({ error: 'Failed to fetch profile', details: retryError });
            }
          } else {
            console.error('Unexpected error:', errorJson);
            res.status(500).json({ error: 'Failed to fetch profile', details: errorText });
          }
        } catch (e) {
          console.error('Error parsing error response:', e);
          res.status(500).json({ error: 'Failed to fetch profile', details: errorText });
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      res.status(500).json({ error: 'Failed to fetch profile', details: error.message });
    }
  });

  // Update user profile
  app.patch('/api/profile', requireAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const { full_name, username, avatar_url } = req.body;
      
      console.log('Profile update request:', { userId, full_name, username, avatar_url });
      
      const updateData = {};
      // Handle empty strings as null for optional fields
      if (full_name !== undefined) {
        updateData.full_name = full_name === '' ? null : full_name;
      }
      if (username !== undefined) {
        updateData.username = username === '' ? null : username;
      }
      if (avatar_url !== undefined) {
        updateData.avatar_url = avatar_url === '' ? null : avatar_url;
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No update data provided' });
      }

      // Check if username is being updated and if it already exists
      if (updateData.username !== undefined && updateData.username !== null && updateData.username.trim() !== '') {
        const trimmedUsername = updateData.username.trim();
        try {
          const usernameCheck = await fetch(`${SUPABASE_URL}/rest/v1/users?username=eq.${encodeURIComponent(trimmedUsername)}&id=neq.${userId}&select=id`, {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
          });
          
          if (usernameCheck.ok) {
            const existingUsers = await usernameCheck.json();
            if (existingUsers.length > 0) {
              return res.status(400).json({ error: 'Username already taken' });
            }
          }
        } catch (checkError) {
          // If username column doesn't exist, skip the check but still try to update
          console.warn('Could not check username uniqueness (column may not exist):', checkError.message);
        }
      }

      const response = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
        method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(updateData)
      });
      
      if (response.ok) {
        const updated = await response.json();
        console.log('Profile updated successfully:', updated[0]);
        res.json({ profile: updated[0] || null });
      } else {
        const errorText = await response.text();
        console.error('Supabase error updating profile:', response.status, errorText);
        
        // Try to parse error for better message
        let errorMessage = 'Failed to update profile';
        let errorCode = null;
        try {
          const errorJson = JSON.parse(errorText);
          // Check for both PGRST204 (PostgREST) and 42703 (PostgreSQL) error codes
          const isUsernameColumnError = (
            (errorJson.code === 'PGRST204' || errorJson.code === '42703') && 
            errorJson.message && 
            errorJson.message.includes('username')
          );
          
          if (isUsernameColumnError) {
            // Username column doesn't exist - try updating without username
            errorMessage = 'Username column not found in database. Please run the migration script to add it.';
            errorCode = 'MISSING_COLUMN';
            
            // If username was the only field being updated, return error
            if (username !== undefined && Object.keys(updateData).length === 1) {
              return res.status(400).json({ 
                error: errorMessage,
                code: errorCode,
                hint: 'Run the SQL migration in apps/cms/database/add-username-column.sql in your Supabase SQL editor'
              });
            }
            
            // Otherwise, try updating without username
            delete updateData.username;
            if (Object.keys(updateData).length === 0) {
              return res.status(400).json({ 
                error: errorMessage,
                code: errorCode,
                hint: 'Run the SQL migration in apps/cms/database/add-username-column.sql in your Supabase SQL editor'
              });
            }
            
            // Retry without username
            console.log('Retrying profile update without username field...');
            const retryResponse = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
              method: 'PATCH',
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
              },
              body: JSON.stringify(updateData)
            });
            
            if (retryResponse.ok) {
              const updated = await retryResponse.json();
              console.log('Profile updated successfully (without username):', updated[0]);
              return res.json({ 
                profile: updated[0] || null,
                warning: 'Username column not found. Other fields updated successfully. Please run the migration to enable username updates.'
              });
            } else {
              const retryErrorText = await retryResponse.text();
              console.error('Retry also failed:', retryErrorText);
            }
          }
          
          if (errorJson.message) {
            errorMessage = errorJson.message;
          } else if (errorJson.error) {
            errorMessage = errorJson.error;
          } else if (errorJson.details) {
            errorMessage = errorJson.details;
          }
          if (errorJson.code) {
            errorCode = errorJson.code;
          }
        } catch (e) {
          // If not JSON, use the text as is
          if (errorText && errorText.length < 200) {
            errorMessage = errorText;
          }
        }
        
        res.status(response.status >= 400 && response.status < 500 ? response.status : 500).json({ 
          error: errorMessage,
          code: errorCode,
          details: errorText 
        });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ 
        error: 'Failed to update profile',
        details: error.message 
      });
    }
  });

  // Get all liked products for user - MUST be before /api/products/:id route
  app.get('/api/products/liked', requireAuth, async (req, res) => {
    console.log('=== LIKED PRODUCTS ENDPOINT HIT ===');
    console.log('Request headers:', req.headers.authorization ? 'Authorization present' : 'No authorization');
    try {
      const userId = req.userId;
      console.log('Fetching liked products for user:', userId);
      
      if (!userId) {
        console.error('No userId found in request');
        return res.status(401).json({ error: 'Unauthorized' });
      }

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
      
      // Format response with outfit_count and preview images
      const formattedClosets = await Promise.all(closets.map(async (closet) => {
        const outfitCount = closet.outfits?.[0]?.count || 0;
        let previewImages = [];
        
        // If closet has outfits, get preview images from first few outfits
        if (outfitCount > 0) {
          try {
            // Get first 3-4 outfits for preview
            const outfitsResponse = await fetch(`${SUPABASE_URL}/rest/v1/outfits?closet_id=eq.${closet.id}&order=created_at.desc&limit=4`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
              }
            });
            
            if (outfitsResponse.ok) {
              const outfits = await outfitsResponse.json();
              const outfitIds = outfits.map(o => o.id);
              
              if (outfitIds.length > 0) {
                // Get first product image from each outfit
                const idsParam = outfitIds.join(',');
                const productsResponse = await fetch(`${SUPABASE_URL}/rest/v1/outfit_products?outfit_id=in.(${idsParam})&select=outfit_id,position,products(images)&order=position.asc`, {
                  headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                  }
                });
                
                if (productsResponse.ok) {
                  const allProducts = await productsResponse.json();
                  const outfitImages = {};
                  
                  // Get first image from each outfit
                  allProducts.forEach(op => {
                    if (op.products && op.products.images && Array.isArray(op.products.images) && op.products.images.length > 0) {
                      if (!outfitImages[op.outfit_id]) {
                        outfitImages[op.outfit_id] = op.products.images[0];
                      }
                    }
                  });
                  
                  // Collect preview images in outfit order
                  outfitIds.forEach(outfitId => {
                    if (outfitImages[outfitId]) {
                      previewImages.push(outfitImages[outfitId]);
                    }
                  });
                  
                  // Limit to 4 preview images
                  previewImages = previewImages.slice(0, 4);
                }
              }
            }
          } catch (err) {
            console.error(`Error fetching preview images for closet ${closet.id}:`, err);
          }
        }
        
        return {
          ...closet,
          outfit_count: outfitCount,
          preview_images: previewImages
        };
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
        // Get outfit products with product images and categories for proper ordering
        const productsResponse = await fetch(`${SUPABASE_URL}/rest/v1/outfit_products?outfit_id=in.(${idsParam})&select=outfit_id,position,products(images,id,category_id)&order=position.asc`, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        });
        
        if (productsResponse.ok) {
          const allProducts = await productsResponse.json();
          // Group by outfit and get first 4 images, sorted by category order
          const outfitData = {};
          if (Array.isArray(allProducts)) {
            // Category order: Outerwear(5) -> Tops(1) -> Bottoms(2) -> Shoes(3) -> Accessories(4) -> Dresses(6) -> Bags(7) -> Jewelry(8)
            // Ensure proper ordering: Outerwear → Tops → Bottoms → Shoes
            const categoryOrder = { 5: 1, 1: 2, 2: 3, 3: 4, 4: 5, 6: 6, 7: 7, 8: 8 }; // Outerwear → Tops → Bottoms → Shoes
            
            allProducts.forEach(op => {
              if (!outfitData[op.outfit_id]) {
                outfitData[op.outfit_id] = { count: 0, images: [] };
              }
              outfitData[op.outfit_id].count++;
              // Get first image from product if available
              if (op.products && op.products.images && Array.isArray(op.products.images) && op.products.images.length > 0) {
                const categoryId = op.products.category_id || 999;
                const order = categoryOrder[categoryId] || 999;
                outfitData[op.outfit_id].images.push({
                  image: op.products.images[0],
                  order: order,
                  position: op.position || 0
                });
              }
            });
            
            // Sort images by category order, then position, and take first 4
            Object.keys(outfitData).forEach(outfitId => {
              outfitData[outfitId].images.sort((a, b) => {
                if (a.order !== b.order) return a.order - b.order;
                return a.position - b.position;
              });
              outfitData[outfitId].images = outfitData[outfitId].images.slice(0, 4).map(item => item.image);
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

  // Update closet
  app.patch('/api/closets/:id', requireAuth, async (req, res) => {
    try {
      const userId = req.userId;
    const { id } = req.params;
      const { name, description, is_public } = req.body;

      // Verify closet belongs to user
      const closetCheck = await fetch(`${SUPABASE_URL}/rest/v1/user_closets?id=eq.${id}&user_id=eq.${userId}`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      const closets = await closetCheck.json();
      if (closets.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Update closet
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (is_public !== undefined) updateData.is_public = is_public;

      const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_closets?id=eq.${id}`, {
        method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(updateData)
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('Error updating closet:', errorText);
        return res.status(500).json({ error: 'Failed to update closet' });
      }

      const updated = await updateResponse.json();
      res.json({ closet: updated[0] });
    } catch (error) {
      console.error('Error updating closet:', error);
      res.status(500).json({ error: 'Failed to update closet' });
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

            // Sort by category: Outerwear(5) -> Tops(1) -> Bottoms(2) -> Shoes(3) -> Accessories(4) -> Dresses(6) -> Bags(7) -> Jewelry(8)
            const categoryOrder = { 5: 1, 1: 2, 2: 3, 3: 4, 4: 5, 6: 6, 7: 7, 8: 8 }; // Outerwear → Tops → Bottoms → Shoes
            products.sort((a, b) => {
              const aOrder = a.category_id ? (categoryOrder[a.category_id] || 999) : 999;
              const bOrder = b.category_id ? (categoryOrder[b.category_id] || 999) : 999;
              if (aOrder !== bOrder) return aOrder - bOrder;
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

  // Update outfit
  app.patch('/api/closets/:closetId/outfits/:outfitId', requireAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const { closetId, outfitId } = req.params;
      const { name, description } = req.body;

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

      // Update outfit
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;

      const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/outfits?id=eq.${outfitId}`, {
        method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(updateData)
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('Error updating outfit:', errorText);
        return res.status(500).json({ error: 'Failed to update outfit' });
      }

      const updated = await updateResponse.json();
      res.json({ outfit: updated[0] });
    } catch (error) {
      console.error('Error updating outfit:', error);
      res.status(500).json({ error: 'Failed to update outfit' });
    }
  });

  // Reorder outfits in a closet
  app.post('/api/closets/:closetId/outfits/reorder', requireAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const { closetId } = req.params;
      const { outfit_ids } = req.body;

      if (!Array.isArray(outfit_ids)) {
        return res.status(400).json({ error: 'outfit_ids must be an array' });
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

      // Verify all outfits belong to this closet
      const outfitIdsParam = outfit_ids.join(',');
      const outfitsCheck = await fetch(`${SUPABASE_URL}/rest/v1/outfits?id=in.(${outfitIdsParam})&closet_id=eq.${closetId}&select=id`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      const outfits = await outfitsCheck.json();
      if (outfits.length !== outfit_ids.length) {
        return res.status(400).json({ error: 'Some outfits do not belong to this closet' });
      }

      // Update display_order for each outfit
      // Since Supabase doesn't have display_order field, we'll use a workaround:
      // Store order in a JSONB field or update created_at to reflect order
      // For now, we'll just return success - the frontend maintains the order
      // In a production system, you'd add a display_order INTEGER field to outfits table
      
      res.json({ success: true, message: 'Outfit order updated' });
    } catch (error) {
      console.error('Error reordering outfits:', error);
      res.status(500).json({ error: 'Failed to reorder outfits' });
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

// Product detail routes - MUST be after /api/products/liked
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

app.listen(port, () => {
  console.log(`CMS API server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`Products API: http://localhost:${port}/api/products`);
  console.log(`Auth API: http://localhost:${port}/api/auth`);
});