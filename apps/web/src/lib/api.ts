const API_URL = 'http://localhost:3001';

export interface Product {
  id: number;
  title: string;
  description: string | null;
  brand_id: number | null;
  category_id: number | null;
  url: string;
  price: number;
  currency: string;
  gender: string | null;
  colors: string[] | null;
  sizes: string[] | null;
  images: string[] | null;
  external_id: string | null;
  in_stock: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductsResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export async function getProducts(): Promise<Product[]> {
  try {
    const response = await fetch(`${API_URL}/api/products`);
    
    if (!response.ok) {
      console.error('Failed to fetch products:', response.status);
      return [];
    }
    
    const data: ProductsResponse = await response.json();
    console.log(`Fetched ${data.products.length} products`);
    return data.products || [];
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

export async function getProduct(id: number): Promise<Product | null> {
  try {
    const response = await fetch(`${API_URL}/api/products/${id}`);
    
    if (!response.ok) {
      console.error('Failed to fetch product:', response.status);
      return null;
    }
    
    const product: Product = await response.json();
    return product;
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}

export async function createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product | null> {
  try {
    const response = await fetch(`${API_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(product),
    });
    
    if (!response.ok) {
      console.error('Failed to create product:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data.product || null;
  } catch (error) {
    console.error('Error creating product:', error);
    return null;
  }
}