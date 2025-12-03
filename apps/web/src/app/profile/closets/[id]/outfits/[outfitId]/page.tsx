'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter, useParams } from 'next/navigation';

interface Product {
  id: number;
  title: string;
  description: string | null;
  url: string;
  price: number;
  currency: string;
  images: string[] | null;
  category_id: number | null;
  brand_id: number | null;
  position: number;
  category_name?: string;
  brand_name?: string;
}

interface Outfit {
  id: number;
  name: string;
  description: string | null;
  closet_id: number;
  created_at: string;
}

interface Closet {
  id: number;
  name: string;
  description: string | null;
}

export default function OutfitDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { token } = useAuth();
  const closetId = params?.id as string;
  const outfitId = params?.outfitId as string;

  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [closet, setCloset] = useState<Closet | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!token || !closetId || !outfitId) {
      router.push('/auth');
      return;
    }
    fetchOutfitData();
  }, [token, closetId, outfitId]);

  const fetchOutfitData = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/closets/${closetId}/outfits/${outfitId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setOutfit(data.outfit);
        setProducts(data.products || []);
        
        // Also fetch closet info
        const closetRes = await fetch(`http://localhost:3001/api/closets/${closetId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (closetRes.ok) {
          const closetData = await closetRes.json();
          setCloset(closetData.closet);
        }
      } else {
        console.error('Failed to fetch outfit:', res.status);
      }
    } catch (error) {
      console.error('Error fetching outfit:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get category label
  const getCategoryLabel = (categoryId: number | null) => {
    const categories: { [key: number]: string } = {
      1: 'Tops',
      2: 'Bottoms',
      3: 'Shoes',
      4: 'Accessories',
      5: 'Outerwear',
      6: 'Dresses',
      7: 'Bags',
      8: 'Jewelry'
    };
    return categoryId ? categories[categoryId] || 'Other' : 'Other';
  };

  const handleDeleteOutfit = async () => {
    if (!confirm('Are you sure you want to delete this outfit? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`http://localhost:3001/api/closets/${closetId}/outfits/${outfitId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        router.push(`/profile/closets/${closetId}`);
      } else {
        const errorText = await res.text();
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: errorText || `HTTP ${res.status}: ${res.statusText}` };
        }
        alert(`Failed to delete outfit: ${error.error || `HTTP ${res.status}`}`);
      }
    } catch (error: any) {
      console.error('Error deleting outfit:', error);
      alert(`Error deleting outfit: ${error.message || 'Unknown error'}`);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!outfit) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">Outfit not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <button
                onClick={() => router.push(`/profile/closets/${closetId}`)}
                className="text-blue-600 hover:text-blue-800 mb-2"
              >
                ← Back to Closet
              </button>
              <h1 className="text-3xl font-bold">{outfit.name}</h1>
              {outfit.description && (
                <p className="text-gray-600 mt-2">{outfit.description}</p>
              )}
              {closet && (
                <p className="text-sm text-gray-500 mt-1">From: {closet.name}</p>
              )}
            </div>
            <button
              onClick={handleDeleteOutfit}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? 'Deleting...' : 'Delete Outfit'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Outfit Display (Vertical Stack) */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-6">Outfit</h2>
              
              {products.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>No products in this outfit yet.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {products.map((product, index) => (
                    <div
                      key={product.id}
                      className="border rounded-lg p-4 hover:shadow-md transition cursor-pointer"
                      onClick={() => router.push(`/products/${product.id}`)}
                    >
                      <div className="flex gap-4">
                        <div className="w-32 h-32 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                          {product.images && product.images.length > 0 ? (
                            <img
                              src={product.images[0]}
                              alt={product.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-4xl opacity-30">👕</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg mb-1">{product.title}</h3>
                              {product.brand_name && (
                                <p className="text-sm text-gray-600 mb-1">{product.brand_name}</p>
                              )}
                              <p className="text-sm text-gray-500 mb-2">
                                {getCategoryLabel(product.category_id)}
                              </p>
                              <p className="text-lg font-bold">
                                {product.currency || 'USD'} ${product.price?.toFixed(2) || '0.00'}
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/products/${product.id}`);
                              }}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              View →
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Product List Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-4">
              <h3 className="text-xl font-bold mb-4">Products ({products.length})</h3>
              
              {products.length === 0 ? (
                <p className="text-gray-500 text-sm">No products in this outfit.</p>
              ) : (
                <div className="space-y-3">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => router.push(`/products/${product.id}`)}
                      className="flex gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer transition"
                    >
                      <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={product.images[0]}
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-2xl opacity-30">👕</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{product.title}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {getCategoryLabel(product.category_id)}
                        </p>
                        <p className="text-sm font-semibold mt-1">
                          {product.currency || 'USD'} ${product.price?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

