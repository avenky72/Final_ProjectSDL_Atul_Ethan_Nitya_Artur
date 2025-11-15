Software Design Description (SDD): Couture Closet

6.1 Introduction
This project is a fashion platform where users discover clothing items, save them to digital closets and share their style with others.

6.1.1 System Objectives
Primary Objectives:

* Provide a Pinterest-style fashion discovery experience with direct product links to retailers
* Enable users to organize clothing items into themed "outfits" and "closets"
* Facilitate social sharing of style collections between users
* Connect users directly to brands and retailers for purchasing
* Implement AI/ML-powered outfit recommendations

Key Features:

* User authentication and profile management
* Product catalog with search and filtering
* Digital closet organization system
* Drag-and-drop outfit creation
* Product source tracking with retailer links

6.1.2 Hardware, Software, and Human Interfaces
6.1.2.1 Hardware Interfaces

* Network interface for HTTP/HTTPS communication
* Standard mouse and keyboard for user input
* Display for UI rendering
* Local storage for session management

6.1.2.2 Software Interfaces
Frontend Stack:

* Next.js 15 with React 19 for UI framework
* Tailwind CSS v3 for styling
* PostCSS with Autoprefixer for CSS processing
* TypeScript for type safety

Backend Stack:

* Node.js runtime environment
* Express.js for REST API server
* PostgreSQL database via Supabase
* Supabase REST API for data operations

Third-Party Libraries:

@react-oauth/google (v0.12.2) - Google OAuth authentication
bcrypt - Password hashing
jsonwebtoken - JWT token generation and verification
@supabase/supabase-js - Supabase client
Python beautifulsoup4 - Web scraping for product data
google-api-python-client - Google Sheets integration

Communication Protocols:

* HTTP/HTTPS for client-server communication
* REST API endpoints on port 3001
* WebSocket connections for real-time features (maybe idk)

6.1.2.3 User Interfaces

* Web-based responsive UI accessible via modern browsers
* Authentication screens for login/registration
* Product grid display with infinite scroll
* Drag-and-drop interface for outfit creation
* Profile pages for viewing user closets
* Filter controls


6.2 Architectural Design
6.2.1 Major Software Components
Frontend Components (CSCI: Couture Web Application)

Authentication Module - User login, registration, session management
Product Display Module - Product grid, infinite scroll, image rendering
Closet Management Module - Create/edit/delete closets, add products to closets
User Profile Module - Profile viewing, closet browsing
Search & Filter Module - Product search, category filtering, brand filtering
Navigation Module - Header, routing, page transitions


Backend Components (CSCI: CMS API Server)

Authentication Service - JWT-based auth, Google OAuth, session management
Product Service - CRUD operations for products, bulk uploads
User Service - User profile management, preferences
Closet Service - Closet CRUD, product associations
Brand/Category Service - Catalog metadata management
Data Pipeline - Web scraping, product import, Google Sheets integration

Database Components (CSCI: PostgreSQL/Supabase)

User Data - users, user_sessions, user_favorites tables
Product Catalog - products, brands, categories, tags, product_tags tables
Closet Data - user_closets, closet_products tables
Indexes - Performance indexes for search and retrieval

6.2.2 Major Software Interactions
Frontend ↔ Backend Communication:

REST API calls over HTTP/HTTPS
JSON data format for request/response payloads
JWT tokens in Authorization headers for authenticated requests
Response pagination for large datasets

Backend ↔ Database Communication:

Supabase JavaScript client for direct database access
PostgreSQL connection pooling for traditional SQL queries
Parameterized queries for SQL injection prevention
Transaction support for multi-step operations

External Service Integrations:

Google OAuth API for third-party authentication
Cloudinary/AWS S3 for image storage (planned)
Python web scrapers for product data collection
Google Sheets API for product data management

Data Flow Examples:

User login → Frontend sends credentials → Backend validates → Database checks → JWT returned → Frontend stores token
Product fetch → Frontend requests products → Backend queries database → Formats response → Frontend renders grid
Create closet → Frontend sends closet data → Backend validates → Database insert → Response confirms → Frontend updates UI

6.2.3 Architectural Design Diagrams
┌─────────────────────────────────────────┐
│         Client Browser (Frontend)       │
│  Next.js 15 + React 19 + Tailwind CSS   │
│                                         │
│  - Authentication UI                    │
│  - Product Display Grid                 │
│  - Closet Management                    │
│  - User Profiles                        │
└──────────────┬──────────────────────────┘
               │ HTTPS/REST API
               │ Port 3001
┌──────────────▼──────────────────────────┐
│       Backend API Server (CMS)          │
│      Node.js + Express + Supabase       │
│                                         │
│  - Auth Controller (JWT/OAuth)          │
│  - Product Controller                   │
│  - Closet Controller                    │
│  - User Controller                      │
└──────────────┬──────────────────────────┘
               │ Supabase Client
               │
┌──────────────▼──────────────────────────┐
│     PostgreSQL Database (Supabase)      │
│                                         │
│  - users, user_sessions                 │
│  - products, brands, categories         │
│  - user_closets, closet_products        │
│  - Full-text search indexes             │
└─────────────────────────────────────────┘

    External Services:
    - Google OAuth
    - Image Hosting (Cloudinary)?? Maybe
    - Web Scrapers (Python)


6.3 Detailed CSC and CSU Descriptions
CSC Groupings:
CSCI: Couture Closet Application

CSC 1: Frontend Web Application

Authentication CSU
Product Display CSU
Closet Management CSU
User Profile CSU


CSC 2: Backend API Server

Authentication Service CSU
Product Service CSU
Closet Service CSU
User Service CSU


CSC 3: Data Management System

Database Schema CSU
Data Pipeline CSU
Migration Scripts CSU


6.3.1 Detailed Class Descriptions
6.3.1.1 AuthProvider (Frontend)

Purpose: Manages authentication state across the entire application
Location: apps/web/src/lib/auth.tsx
Fields:

user: User | null - Current authenticated user object
token: string | null - JWT authentication token


Methods:

login(email, password) - Authenticate user with credentials
register(email, password, fullName) - Create new user account
logout() - Clear authentication state and local storage


State Management: Uses React Context API for global state
Persistence: Stores token and user data in localStorage

6.3.1.2 SupabaseAuthController (Backend)

Purpose: Handles all authentication operations using Supabase
Location: apps/cms/auth-supabase.controller.js
Fields:

supabase - Supabase client instance
JWT_SECRET - Secret key for JWT token signing


Methods:

register(req, res) - Create new user account with email/password
login(req, res) - Validate credentials and generate JWT
googleAuth(req, res) - Authenticate via Google OAuth
logout(req, res) - Invalidate session token
getCurrentUser(req, res) - Retrieve authenticated user data
requireAuth(req, res, next) - Middleware for protected routes
generateToken(userId) - Create JWT with expiration
verifyToken(token) - Validate and decode JWT


Security: Uses bcrypt for password hashing, JWT for sessions

6.3.1.3 HomePage Component (Frontend)

Purpose: Main product discovery interface with infinite scroll
Location: apps/web/src/app/page.tsx
Fields:

products: Product[] - Array of product objects
loading: boolean - Initial load state
loadingMore: boolean - Pagination load state
page: number - Current pagination page
hasMore: boolean - Whether more products exist
error: string | null - Error message state


Methods:

fetchProducts() - Async function to retrieve products from API
handleLoadMore() - Load next page of products
handleLogout() - Sign out user and redirect


Routing: Protected route requiring authentication
UI Features: Infinite scroll, product grid, loading states

6.3.1.4 Product Service (Backend)

Purpose: Manages all product-related database operations
Location: apps/cms/server.js and apps/cms/server-REST.js
Endpoints:

GET /api/products - Retrieve paginated product list
GET /api/products/:id - Get single product details
POST /api/products - Create new product or update existing
POST /api/products/bulk - Bulk import products


Query Parameters:

page - Page number for pagination
limit - Products per page (default 24)
category - Filter by category slug
brand - Filter by brand ID
search - Full-text search query


Data Validation:

Required: title, url
Optional: description, price, images, etc.
URL deduplication via hash



6.3.1.5 User Model (Database)

Purpose: Stores user account information
Table: users
Fields:

id (SERIAL PRIMARY KEY) - Unique user identifier
email (VARCHAR UNIQUE) - User email address
password_hash (VARCHAR) - Bcrypt hashed password
full_name (VARCHAR) - User's display name
avatar_url (TEXT) - Profile picture URL
auth_provider (VARCHAR) - 'email' or 'google'
google_id (VARCHAR UNIQUE) - Google OAuth ID
email_verified (BOOLEAN) - Email verification status
role (VARCHAR) - User role (default 'user')
created_at (TIMESTAMP) - Account creation date
last_login (TIMESTAMP) - Last login timestamp


Indexes:

idx_users_email on email
idx_users_google_id on google_id



6.3.1.6 Product Model (Database)

Purpose: Stores product catalog information
Table: products
Fields:

id (SERIAL PRIMARY KEY) - Unique product ID
title (VARCHAR) - Product name
description (TEXT) - Product description
brand_id (INTEGER FK) - Reference to brands table
category_id (INTEGER FK) - Reference to categories table
url (TEXT) - Direct link to retailer product page
url_hash (VARCHAR UNIQUE) - Hash for deduplication
price (DECIMAL) - Product price
currency (VARCHAR) - Currency code (default USD)
gender (VARCHAR) - Target gender
colors (JSONB) - Array of available colors
sizes (JSONB) - Array of available sizes
images (JSONB) - Array of image URLs
external_id (VARCHAR) - Retailer SKU
in_stock (BOOLEAN) - Stock availability
created_at, updated_at (TIMESTAMP) - Tracking dates


Indexes:

idx_products_brand_id, idx_products_category_id
idx_products_url_hash for duplicate detection
idx_products_search - Full-text search index
idx_products_gender, idx_products_price - Filter indexes



6.3.1.7 Closet Model (Database)

Purpose: User-created collections of products
Table: user_closets
Fields:

id (SERIAL PRIMARY KEY) - Unique closet ID
user_id (INTEGER FK) - Owner user ID
name (VARCHAR) - Closet name/title
description (TEXT) - Closet description
is_public (BOOLEAN) - Public/private visibility
cover_image (TEXT) - Cover image URL
created_at, updated_at (TIMESTAMP)


Relationships:

One-to-many with users (each user can have multiple closets)
Many-to-many with products via closet_products junction table



6.3.1.8 AuthPage Component (Frontend)

Purpose: Login and registration UI
Location: apps/web/src/app/auth/page.tsx
Fields:

isLogin: boolean - Toggle between login/signup mode
email, password, fullName - Form input states
error: string - Error message display


Methods:

handleSubmit() - Form submission handler
Validates inputs, calls appropriate auth function
Redirects to home on success


UI Features: Form validation, error display, mode toggle

6.3.1.9 Session Model (Database)

Purpose: Tracks active user sessions
Table: user_sessions
Fields:

id (SERIAL PRIMARY KEY)
user_id (INTEGER FK) - Reference to users
token (VARCHAR UNIQUE) - JWT token
expires_at (TIMESTAMP) - Expiration time
ip_address (VARCHAR) - Login IP
user_agent (TEXT) - Browser info
created_at (TIMESTAMP)


Cleanup: Expired sessions should be periodically purged

6.3.1.10 Web Scraper (Data Pipeline)

Purpose: Automated product data collection from retail websites
Location: apps/cms/ Python scripts
Components:

Universal crawler for generic sites
Site-specific parsers for major retailers
Google Sheets integration for data management


Libraries: BeautifulSoup4, requests, google-api-python-client
Output: JSON files or direct database inserts
Features:

Product URL extraction
Metadata parsing (title, price, images)
Brand/category detection
Image downloading
Duplicate detection


6.3.3 Detailed Data Structure Descriptions
6.3.3.1 Product Data Structure
typescriptinterface Product {
  id: number;
  title: string;
  description: string | null;
  brand_id: number | null;
  brand_name?: string;
  category_id: number | null;
  category_name?: string;
  url: string;
  url_hash: string;
  price: number;
  currency: string;
  gender: 'men' | 'women' | 'unisex' | null;
  colors: string[] | null;  // JSONB array
  sizes: string[] | null;   // JSONB array
  images: string[] | null;  // JSONB array
  external_id: string | null;
  in_stock: boolean;
  tags?: string[];  // Joined from product_tags
  created_at: Date;
  updated_at: Date;
}
6.3.3.2 User Data Structure
typescriptinterface User {
  id: number;
  email: string;
  full_name: string;
  avatar_url: string | null;
  auth_provider: 'email' | 'google';
  google_id: string | null;
  email_verified: boolean;
  role: 'user' | 'admin';
  created_at: Date;
  last_login: Date | null;
}
6.3.3.3 Closet Data Structure
typescriptinterface Closet {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  is_public: boolean;
  cover_image: string | null;
  product_count?: number;  // Calculated field
  products?: Product[];     // Joined data
  created_at: Date;
  updated_at: Date;
}
6.3.3.4 Session Data Structure
typescriptinterface UserSession {
  id: number;
  user_id: number;
  token: string;
  expires_at: Date;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}
6.3.3.5 API Response Pagination
typescriptinterface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
6.3.3.6 JWT Token Payload
typescriptinterface TokenPayload {
  userId: number;
  email: string;
  role: string;
  iat: number;  // Issued at
  exp: number;  // Expiration
}
6.3.3.7 Web Scraper Output Format
json{
  "title": "Product Name",
  "description": "Product description text",
  "brand_name": "Brand Name",
  "brand_website": "https://brand.com",
  "category_slug": "tops",
  "url": "https://retailer.com/product",
  "price": 49.99,
  "currency": "USD",
  "gender": "women",
  "colors": ["black", "white", "navy"],
  "sizes": ["S", "M", "L", "XL"],
  "images": [
    "https://cdn.example.com/image1.jpg",
    "https://cdn.example.com/image2.jpg"
  ],
  "external_id": "SKU-12345",
  "tags": ["casual", "summer", "cotton"]
}


6.3.4 Detailed Design Diagrams
Diagram 1: Authentication Sequence Diagram
User          AuthPage       Backend       Database
 |               |              |             |
 |--Login Form-->|              |             |
 |               |--POST /login->             |
 |               |              |--Query----->|
 |               |              |<-User Data--|
 |               |              |             |
 |               |<--JWT Token--|             |
 |<-Redirect(/)--|              |             |
 |               |              |             |
Diagram 2: Product Fetch Activity Diagram
START
  ↓
[User navigates to home page]
  ↓
[Check if user is authenticated]
  ↓ No → [Redirect to /auth]
  ↓ Yes
[Fetch products from API]
  ↓
[Display loading state]
  ↓
[Receive product data]
  ↓
[Render product grid]
  ↓
[User scrolls to bottom] ←──┐
  ↓                         │
[Load more products]        │
  ↓                         │
[Append to grid] ───────────┘
  ↓
END
Diagram 3: Database Entity-Relationship Diagram
users (1) ────── (∞) user_sessions
  │
  │ (1)
  │
  ↓ (∞)
user_closets
  │
  │ (∞)
  ↓ (∞)
closet_products ← (∞) products
                        │ (∞)
                        ↓ (1)
                      brands

products (∞) ─── (1) categories
  │
  │ (∞)
  ↓ (∞)
product_tags ← (∞) tags
Diagram 4: Component Class Diagram
┌──────────────────┐
│   AuthProvider   │
├──────────────────┤
│ - user: User     │
│ - token: string  │
├──────────────────┤
│ + login()        │
│ + register()     │
│ + logout()       │
└────────┬─────────┘
         │ uses
         ↓
┌──────────────────┐
│    AuthPage      │
├──────────────────┤
│ - email: string  │
│ - password: str  │
│ - isLogin: bool  │
├──────────────────┤
│ + handleSubmit() │
└──────────────────┘

┌──────────────────┐
│    HomePage      │
├──────────────────┤
│ - products: []   │
│ - loading: bool  │
│ - page: number   │
├──────────────────┤
│ + fetchProducts()│
│ + loadMore()     │
└────────┬─────────┘
         │ fetches
         ↓
┌──────────────────┐
│ ProductService   │
├──────────────────┤
│ + getProducts()  │
│ + createProduct()│
└──────────────────┘
Diagram 5: State Diagram for User Session
[Initial]
   ↓
[Unauthenticated]
   ↓ login/register
[Authenticated]
   │
   ├─→ [Active Session] ──timeout──→ [Session Expired]
   │                                        ↓
   └─→ [Logged Out] ←──────────────── [Redirect to Login]

6.4 Database Design and Description
6.4.1 Database Design ER Diagram
Entity-Relationship Diagram (ERD):
┌─────────────┐
│    users    │
├─────────────┤
│ PK id       │
│    email    │
│ password_h  │
│ full_name   │
│ avatar_url  │
│ created_at  │
└──────┬──────┘
       │ 1
       │
       │ ∞
┌──────▼──────────┐
│ user_sessions   │
├─────────────────┤
│ PK id           │
│ FK user_id      │
│    token        │
│ expires_at      │
│ created_at      │
└─────────────────┘

┌──────────────┐
│    users     │
└──────┬───────┘
       │ 1
       │
       │ ∞
┌──────▼───────────┐
│  user_closets    │
├──────────────────┤
│ PK id            │
│ FK user_id       │
│    name          │
│    description   │
│    is_public     │
│    cover_image   │
│ created_at       │
└──────┬───────────┘
       │ 1
       │
       │ ∞
┌──────▼─────────────┐         ┌────────────┐
│  closet_products   │ ∞───1───│  products  │
├────────────────────┤         ├────────────┤
│ PK FK closet_id    │         │ PK id      │
│ PK FK product_id   │         │    title   │
│    added_at        │         │ FK brand_id│
│    notes           │         │ FK cat_id  │
└────────────────────┘         │    url     │
                               │    price   │
                               │    images  │
                               └──────┬─────┘
                                      │ ∞
                                      │ 1
                               ┌──────▼─────┐
                               │   brands   │
                               ├────────────┤
                               │ PK id      │
                               │    name    │
                               │ website    │
                               └────────────┘

┌─────────────┐         ┌────────────────┐         ┌──────────┐
│  products   │ ∞───∞───│ product_tags   │ ∞───1───│   tags   │
└─────────────┘         ├────────────────┤         ├──────────┤
                        │ PK FK prod_id  │         │ PK id    │
                        │ PK FK tag_id   │         │    name  │
                        └────────────────┘         │    slug  │
                                                   └──────────┘

┌─────────────┐
│  products   │ ∞
└──────┬──────┘
       │ 1
┌──────▼────────┐
│  categories   │
├───────────────┤
│ PK id         │
│    name       │
│    slug       │
└───────────────┘
Key Relationships:

One user can have many sessions (1:∞)
One user can have many closets (1:∞)
One closet can have many products (∞:∞ via junction table)
One product belongs to one brand (∞:1)
One product belongs to one category (∞:1)
One product can have many tags (∞:∞ via junction table)

6.4.2 Database Access
Access Methods:

Supabase JavaScript Client (Primary)

Used by backend API for most operations
Provides automatic connection pooling
Built-in query builder for type-safe queries
Supports real-time subscriptions
Example usage:



javascript     const { data, error } = await supabase
       .from('products')
       .select('*')
       .eq('brand_id', 5)
       .limit(24);

Direct PostgreSQL Connection (Fallback)

Used by server.js for complex queries
Connection string from environment variables
Parameterized queries to prevent SQL injection
Example:



javascript     const result = await pool.query(
       'SELECT * FROM products WHERE id = $1',
       [productId]
     );

Connection Configuration:

Environment variables: SUPABASE_URL, SUPABASE_ANON_KEY
Connection pooling enabled by default
SSL/TLS encryption for all connections
Automatic retry on connection failure


Query Optimization:

Indexes on frequently queried columns
Full-text search index for product searches
Pagination to limit result set sizes
Eager loading of related data (JOINs)



6.4.3 Database Security
Authentication & Authorization:

Row-Level Security (RLS) policies in Supabase
Users can only access their own data
API uses service role key for admin operations
Client connections use anonymous key with RLS

Data Protection:

Passwords hashed with bcrypt (salt rounds: 10)
JWT tokens for stateless authentication
Session tokens stored with expiration timestamps
Environment variables for all secrets (never hardcoded)

Access Control:

requireAuth middleware on protected routes
Role-based permissions (user vs admin)
Public/private closets controlled by is_public flag
Users can only modify their own closets and profiles

SQL Injection Prevention:

All queries use parameterized statements
Supabase client handles escaping automatically
Input validation on all user-submitted data
Type checking with TypeScript

Data Integrity:

Foreign key constraints enforce referential integrity
UNIQUE constraints on emails, tokens, URL hashes
NOT NULL constraints on required fields
CASCADE deletes for related records (e.g., sessions when user deleted)

Backup & Recovery:

Supabase provides automated daily backups
Point-in-time recovery available
Database migrations tracked in version control

