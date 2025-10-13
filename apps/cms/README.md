# CMS - Couture Closet Catalog Management System

This directory contains the backend API server and data pipeline for the fashion curation website. It handles product data management, web scraping, and database operations.

(made with help of Cursor, to use the crawler for now make sure to run the server-REST.js not the direct npm run dev)

## Structure

```
apps/cms/
├── README.md                 # This file
├── package.json             # Node.js dependencies and scripts
├── .env                     # Environment variables (database, API keys)
├── server.js                # Main API server (direct PostgreSQL connection)
├── server-REST.js           # REST API server (Supabase connection)
├── setup-db.js              # Database schema setup script
├── requirements.txt         # Python dependencies for crawlers
├── credentials.json         # Google Cloud service account credentials
├── database/
│   └── schema.sql           # PostgreSQL database schema
├── crawled_products/        # Output directory for scraped data
└── [Python crawler files]   # Various crawler implementations
```


### Core Server Files

#### `server.js`
- **Purpose**: Main API server using direct PostgreSQL connection
- **Features**: 
  - Product CRUD operations
  - Brand and category management
  - Health check endpoint
- **Usage**: `npm start` or `npm run dev`

#### `server-REST.js`
- **Purpose**: REST API server using Supabase connection
- **Features**:
  - Supabase REST API integration
  - Product creation and retrieval
  - Health monitoring
- **Usage**: Currently active server for production

#### `setup-db.js`
- **Purpose**: Database initialization script
- **Features**:
  - Executes `schema.sql` to create tables
  - Sets up default categories and tags
  - Handles connection errors gracefully
- **Usage**: `npm run db:setup`

### Configuration Files

#### `package.json`
- **Purpose**: Node.js project configuration
- **Scripts**:
  - `start`: Run production server
  - `dev`: Run development server with nodemon
  - `db:setup`: Initialize database schema
  - `crawler:test`: Test Python crawler
  - `crawler:run`: Run full crawler pipeline

#### `.env`
- **Purpose**: Environment variables and secrets
- **Variables**:
  - `SUPABASE_ANON_KEY`: Supabase anonymous key
  - `PORT`: Server port (default: 3001)
  - `NODE_ENV`: Environment (development/production)

#### `requirements.txt`
- **Purpose**: Python package dependencies
- **Key packages**:
  - `requests`: HTTP requests
  - `beautifulsoup4`: HTML parsing
  - `google-api-python-client`: Google Sheets integration
  - `python-dotenv`: Environment variable loading

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

### Crawler Files

#### `crawler_sheet_writer`
- **Purpose**: Universal web scraper with Google Sheets integration
- **Features**:
  - Multi-site product crawling
  - Google Sheets API integration
  - Supabase database posting
  - Image URL extraction
  - Duplicate detection
- **Usage**: `python crawler_sheet_writer`

#### `halara_crawler.py`
- **Purpose**: Specialized crawler for Halara.com
- **Features**:
  - Dynamic category discovery
  - Pagination handling
  - Infringement detection
  - Advanced product extraction
- **Usage**: Reference implementation for other crawlers

#### `api_writer.py`
- **Purpose**: API client for posting products to the CMS
- **Features**:
  - Product data formatting
  - Duplicate detection
  - Batch posting
  - Error handling
- **Usage**: `python api_writer.py`

### Output Directory

#### `crawled_products/`
- **Purpose**: Storage for scraped product data
- **Contents**:
  - JSON files with product data
  - CSV exports
  - Timestamped outputs
- **Auto-created**: Directory is created automatically by crawlers

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

### Example Product Creation (without crawler, straight CURL)
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

## Web Scraping Pipeline (to fill database)

### 1. Universal Crawler
The `crawler_sheet_writer` can handle any website:
- Detects site structure automatically
- Extracts product information
- Handles images and pricing
- Posts to both database and Google Sheets

### 2. Google Sheets Integration
- Requires `credentials.json` from Google Cloud Console
- Creates timestamped sheets
- Displays product images
- Organizes data by site

### 3. Database Integration
- Posts products to Supabase
- Handles duplicates
- Validates data format
- Provides error reporting


