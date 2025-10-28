'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

interface Product { 
  id: number; 
  title: string; 
  description: string | null; 
  url: string; 
  price: number; 
  currency: string; 
  images: string[] | null; 
  in_stock: boolean; 
  category_id: number | null; 
  brand_id: number | null; 
}

interface ProductsResponse { 
  products: Product[]; 
  pagination: { page: number; limit: number; total: number; pages: number; }; 
}

export default function Page() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/auth');
      return;
    }

    const fetchProducts = async () => {
      if (page > 1) setLoadingMore(true);
      
      try {
        const res = await fetch(`http://localhost:3001/api/products?page=${page}&limit=24`);
        if (!res.ok) throw new Error();
        
        const data: ProductsResponse = await res.json();
        
        if (page === 1) {
          setProducts(data.products || []);
        } else {
          setProducts(prev => [...prev, ...(data.products || [])]);
        }
        
        setHasMore(data.pagination.page < data.pagination.pages);
        setError(null);
      } catch {
        setError('Could not load products.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    fetchProducts();
  }, [user, router, page]);

  if (!user) return null;

  if (loading) return <div className="flex justify-center items-center min-h-screen text-xl">Loading products...</div>;

  if (error) return (
    <div className="flex flex-col justify-center items-center min-h-screen gap-4">
      <div className="text-xl text-red-600">Error</div>
      <div className="text-gray-600">{error}</div>
      <button onClick={() => location.reload()} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Retry</button>
    </div>
  );

  return (
    <div>
      <div className="bg-white border-b px-4 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold">Couture Closet</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Welcome, {user.fullName}</span>
          <button 
            onClick={logout}
            className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Products ({products.length})</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map(product => (
            <div key={product.id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="aspect-square bg-gray-100 flex items-center justify-center">
                {product.images && product.images[0] ? (
                  <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-gray-400">No image</div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold mb-2 line-clamp-2">{product.title}</h3>
                {product.description && (
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{product.description}</p>
                )}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-bold">{product.currency} {product.price}</span>
                  {product.in_stock ? (
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">In Stock</span>
                  ) : (
                    <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">Out of Stock</span>
                  )}
                </div>
                <a href={product.url} target="_blank" rel="noopener noreferrer" 
                   className="block w-full text-center bg-blue-600 text-white py-2 rounded hover:bg-blue-700 text-sm">
                  View Product
                </a>
              </div>
            </div>
          ))}
        </div>

        {hasMore && (
          <div className="flex justify-center mt-8">
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={loadingMore}
              className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingMore ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}