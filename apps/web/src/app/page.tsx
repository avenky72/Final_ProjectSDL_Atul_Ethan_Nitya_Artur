'use client';

import { useState, useEffect } from 'react';

interface Product { id: number; title: string; description: string | null; url: string; price: number; currency: string; images: string[] | null; in_stock: boolean; category_id: number | null; brand_id: number | null; }

interface ProductsResponse { products: Product[]; pagination: { page: number; limit: number; total: number; pages: number; }; }


export default function Page() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);



  useEffect(() => {
    fetch('http://localhost:3001/api/products')
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })

      .then((data: ProductsResponse) => {
        setProducts(data.products || []);
        setError(null);
      })

      .catch(() => setError('Could not load products.'))
      .finally(() => setLoading(false));

  }, []);

  if (loading) return <div className="flex justify-center items-center min-h-screen text-xl">Loading products...</div>;


  if (error) return (
    <div className="flex flex-col justify-center items-center min-h-screen gap-4">
      <div className="text-xl text-red-600">Error</div>
      <div className="text-gray-600">{error}</div>
      <button onClick={() => location.reload()} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Retry</button>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Products ({products.length})</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map(product => (

          <div key={product.id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="aspect-square bg-gray-100 flex items-center justify-center">
              {product.images && product.images[0] ? (
                <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2RkZCIvPjx0ZXh0IHRleHQtYW5jaG9yPSJtaWRkbGUiIHg9IjIwMCIgeT0iMjAwIiBzdHlsZT0iZmlsbDojOTk5O2ZvbnQtd2VpZ2h0OmJvbGQ7Zm9udC1zaXplOjIwcHg7Zm9udC1mYW1pbHk6QXJpYWwsSGVsdmV0aWNhLHNhbnMtc2VyaWY7ZG9taW5hbnQtYmFzZWxpbmU6Y2VudHJhbCI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';
                }} />
              ) : (
                
                <div className="text-gray-400 text-center">
                  <svg className="w-20 h-20 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm">No Image</span>
                </div>
              )}
            </div>

            <div className="p-4">
              <h3 className="font-semibold text-lg mb-1 truncate">{product.title}</h3>
              {product.description && <p className="text-gray-600 text-sm mb-2 line-clamp-2">{product.description}</p>}

              <div className="flex justify-between items-center mb-3">
                <span className="text-xl font-bold">
                  {product.price != null ? (
                    <>
                      {product.currency === 'USD' ? '$' : product.currency}{product.price.toFixed(2)}
                    </>
                  ) : (
                    <span className="text-gray-500">Price not available</span>
                  )}
                </span>
                <span className={`text-sm px-2 py-1 rounded ${product.in_stock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {product.in_stock ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>

              <a href={product.url} target="_blank" rel="noopener noreferrer" className="block w-full text-center bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors">View Product</a>
            </div>
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-xl mb-2">No products found</p>
        </div>
      )}
    </div>
  );
}
