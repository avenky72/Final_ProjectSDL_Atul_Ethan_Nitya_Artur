const API_URL = 'http://localhost:3001';

export interface Product {
  id: number;
  title: string;
  description: string;
  url: string;
  price: number;
  currency: string;
  images: string[];
  in_stock: boolean;
}

export async function getProducts(): Promise<Product[]> {
  try {
    const response = await fetch(`${API_URL}/api/products`);
    
    if (!response.ok) {
      console.error('Failed to fetch products');
      return [];
    }
    
    const data = await response.json();
    return data.products || [];
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}