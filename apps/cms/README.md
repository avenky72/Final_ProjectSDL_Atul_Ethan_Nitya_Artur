# CMS - Couture Closet Catalog Management System

This directory contains the backend API server for the fashion curation website. It handles product data management and database operations.

**Manual Database Management**: Products are added manually through the API or Supabase dashboard.e

## Structure

```
apps/cms/
├── README.md                 # This file
├── package.json             # Node.js dependencies and scripts
├── .env                     # Environment variables (database, API keys)
├── server-REST.js           # REST API server (Supabase connection)
└── database/
    └── schema.sql           # PostgreSQL database schema
```


### Core Server Files

#### `server-REST.js`
- **Purpose**: REST API server using Supabase connection
- **Features**:
  - Supabase REST API integration
  - Product creation, retrieval, and updates
  - Health monitoring
- **Usage**: `node server-REST.js`

### Configuration Files

#### `package.json`
- **Purpose**: Node.js project configuration
- **Scripts**:
  - `start`: Run production server
  - `dev`: Run development server with nodemon

#### `.env`
- **Purpose**: Environment variables and secrets
- **Variables**:
  - `SUPABASE_ANON_KEY`: Supabase anonymous key
  - `PORT`: Server port (default: 3001)
  - `NODE_ENV`: Environment (development/production)

### Database Files

#### `database/schema.sql`
- **Purpose**: PostgreSQL database schema definition
- **Tables**:
  - `brands`: Fashion brand information
  - `categories`: Product categories (Clothing, Accessories, etc.)
  - `tags`: Product tags for filtering
  - `products`: Main product catalog
  - `product_tags`: Many-to-many relationship between products and tags
- **Features**:
  - Indexes for performance
  - Default data insertion
  - Foreign key constraints

## Manual Product Management

Products are added manually through:
1. **Supabase Dashboard**: Direct database editing
2. **API Endpoints**: Using curl commands or frontend
3. **Image Updates**: Using PATCH endpoint to add images

## API Endpoints

### Health Check
```
GET /health
```
Returns server status and database connection info.

### Products
```
GET /api/products          # Get all products
POST /api/products         # Create new product
```

### Example Product Creation
```bash
curl -X POST http://localhost:3001/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Sample Product",
    "description": "Product description",
    "url": "https://example.com/product",
    "price": 29.99,
    "category_id": 1,
    "currency": "USD",
    "in_stock": true
  }'
```

### Example Product Update (Add Images)
```bash
curl -X PATCH http://localhost:3001/api/products/1 \
  -H "Content-Type: application/json" \
  -d '{"images": ["https://example.com/product-image.jpg"]}'
```

