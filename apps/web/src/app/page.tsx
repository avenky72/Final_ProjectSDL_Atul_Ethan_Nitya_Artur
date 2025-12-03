'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Logo from '@/components/Logo';

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
  gender: string | null;
  colors: string[] | null;
  brand_name?: string;
  category_name?: string;
}

interface Brand {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface OutfitCreation {
  closetId: number;
  closetName: string;
  mode: string;
  selectedProducts: any[];
}

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout, token } = useAuth();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  // Filters
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  
  // Outfit Creation Mode
  const isOutfitMode = searchParams.get('outfit-mode') === 'true';
  const viewOutfitId = searchParams.get('view-outfit');
  const [outfitCreation, setOutfitCreation] = useState<OutfitCreation | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [outfitName, setOutfitName] = useState('');
  const [showLikedProducts, setShowLikedProducts] = useState(false);
  const [likedProducts, setLikedProducts] = useState<Product[]>([]);
  const [loadingLiked, setLoadingLiked] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [brandsRes, categoriesRes] = await Promise.all([
          fetch('http://localhost:3001/api/brands'),
          fetch('http://localhost:3001/api/categories'),
        ]);

        if (brandsRes.ok) {
          const brandsData = await brandsRes.json();
          setBrands(brandsData);
        }
        
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setCategories(categoriesData);
        }
      } catch (error) {
        console.error('Error fetching filters:', error);
      }
    };

    fetchFilterOptions();
    fetchProducts();
    
    // Check if we're in outfit creation mode
    if (isOutfitMode) {
      const creation = sessionStorage.getItem('outfitCreation');
      if (creation) {
        const parsed = JSON.parse(creation);
        setOutfitCreation(parsed);
        setSelectedProducts(parsed.selectedProducts || []);
      }
      // Fetch liked products when entering outfit mode
      if (token) {
        fetchLikedProducts();
      }
    }
    
    // Check if viewing an outfit
    if (viewOutfitId) {
      fetchOutfitDetails(viewOutfitId);
    }
  }, [isOutfitMode, viewOutfitId]);

  const fetchProducts = async (pageNum = 1) => {
    try {
      setLoading(pageNum === 1);
      
      let url = `http://localhost:3001/api/products?page=${pageNum}&limit=24`;
      if (selectedCategory) url += `&category=${selectedCategory}`;
      if (selectedBrand) url += `&brand=${selectedBrand}`;
      if (priceRange.min) url += `&minPrice=${priceRange.min}`;
      if (priceRange.max) url += `&maxPrice=${priceRange.max}`;

      const res = await fetch(url);
      const data = await res.json();
      
      if (pageNum === 1) {
        setProducts(data.products || []);
      } else {
        setProducts(prev => [...prev, ...(data.products || [])]);
      }
      
      setHasMore(data.pagination?.page < data.pagination?.pages);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLikedProducts = async () => {
    if (!token) return;
    
    setLoadingLiked(true);
    try {
      const res = await fetch('http://localhost:3001/api/products/liked', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setLikedProducts(data.products || []);
      } else {
        const errorText = await res.text();
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: errorText || `HTTP ${res.status}` };
        }
        console.error('Failed to fetch liked products:', res.status, error);
        setLikedProducts([]); // Set empty array on error
      }
    } catch (error) {
      console.error('Error fetching liked products:', error);
      setLikedProducts([]);
    } finally {
      setLoadingLiked(false);
    }
  };

  const fetchOutfitDetails = async (outfitId: string) => {
    try {
      const outfit = sessionStorage.getItem('viewOutfit');
      if (!outfit || !token) return;
      
      const parsed = JSON.parse(outfit);
      const res = await fetch(`http://localhost:3001/api/closets/${parsed.closetId}/outfits/${outfitId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setSelectedProducts(data.products || []);
      setOutfitName(data.outfit?.name || 'Viewing Outfit');
    } catch (error) {
      console.error('Error fetching outfit:', error);
    }
  };

  const toggleProductSelection = (product: Product) => {
    if (viewOutfitId) return; // Don't allow changes when viewing
    
    setSelectedProducts(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) {
        return prev.filter(p => p.id !== product.id);
      } else {
        return [...prev, product];
      }
    });
  };

  const saveOutfit = async () => {
    if (!outfitName || selectedProducts.length === 0 || !outfitCreation || !token) {
      alert('Please name your outfit and select at least one product');
      return;
    }

    try {
      // Create outfit
      const outfitRes = await fetch(`http://localhost:3001/api/closets/${outfitCreation.closetId}/outfits`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: outfitName,
          description: `${selectedProducts.length} items`
        })
      });

      if (outfitRes.ok) {
        const { outfit } = await outfitRes.json();
        
        // Add products to outfit
        for (let i = 0; i < selectedProducts.length; i++) {
          await fetch(`http://localhost:3001/api/closets/${outfitCreation.closetId}/outfits/${outfit.id}/products`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              product_id: selectedProducts[i].id,
              position: i
            })
          });
        }
        
        // Clear session and redirect
        sessionStorage.removeItem('outfitCreation');
        router.push('/profile');
      }
    } catch (error) {
      console.error('Error saving outfit:', error);
      alert('Failed to save outfit');
    }
  };

  const cancelOutfitCreation = () => {
    sessionStorage.removeItem('outfitCreation');
    sessionStorage.removeItem('viewOutfit');
    router.push('/profile');
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProducts(nextPage);
  };

  useEffect(() => {
    fetchProducts(1);
  }, [selectedCategory, selectedBrand, priceRange]);

  const handleLogout = () => {
    logout();
    router.push('/auth');
  };

  return (
    <div className="min-h-screen relative" style={{ zIndex: 1 }}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div 
            className="flex items-center cursor-pointer hover:opacity-80 transition"
            onClick={() => router.push('/')}
          >
            <Logo className="w-10 h-10 text-black" />
          </div>
          <div className="flex gap-3 items-center">
            {!isOutfitMode && (
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="p-2 rounded-full border border-gray-300 hover:bg-gray-50 transition"
                aria-label="Toggle filters"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>
            )}
            {user ? (
              <div className="flex gap-2">
                <button
                  onClick={() => router.push('/profile')}
                  className="p-2 rounded-full hover:bg-gray-100 transition"
                  aria-label="Profile"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </button>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-full hover:bg-gray-100 transition"
                  aria-label="Sign out"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                onClick={() => router.push('/auth')}
                className="px-4 py-2 rounded-full bg-black text-white hover:bg-gray-800 text-sm font-medium transition"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Outfit Creation Bar */}
      {(isOutfitMode || viewOutfitId) && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-medium">
                {viewOutfitId ? '👁️ Viewing Outfit' : '✨ Creating Outfit'}
                {outfitCreation?.closetName && ` for ${outfitCreation.closetName}`}
              </span>
              {!viewOutfitId && (
                <input
                  type="text"
                  placeholder="Name your outfit..."
                  value={outfitName}
                  onChange={(e) => setOutfitName(e.target.value)}
                  className="px-3 py-1 border rounded bg-white"
                />
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm bg-blue-100 px-3 py-1 rounded">
                {selectedProducts.length} items selected
              </span>
              {!viewOutfitId && (
                <button
                  onClick={saveOutfit}
                  disabled={selectedProducts.length === 0 || !outfitName}
                  className="bg-blue-600 text-white px-6 py-2 rounded disabled:bg-gray-400 hover:bg-blue-700"
                >
                  Save Outfit
                </button>
              )}
              <button
                onClick={cancelOutfitCreation}
                className="text-gray-600 hover:text-black"
              >
                {viewOutfitId ? '← Back to Profile' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="sticky top-[57px] z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-xs font-medium mb-2 text-gray-700">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.slug}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Brand Filter */}
              <div>
                <label className="block text-xs font-medium mb-2 text-gray-700">Brand</label>
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">All Brands</option>
                  {brands.map(brand => (
                    <option key={brand.id} value={brand.id}>{brand.name}</option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-xs font-medium mb-2 text-gray-700">Price Range</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                    className="w-1/2 p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                    className="w-1/2 p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSelectedCategory('');
                    setSelectedBrand('');
                    setPriceRange({ min: '', max: '' });
                  }}
                  className="w-full px-4 py-2 text-sm text-gray-600 hover:text-black border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Products Masonry */}
      <main className="relative" style={{ zIndex: 1 }}>
        {showLikedProducts && isOutfitMode ? (
          // Show liked products
          loadingLiked ? (
            <div className="text-center py-12 text-gray-600">Loading liked products...</div>
          ) : likedProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No liked products yet.</p>
              <p className="text-sm text-gray-400">Like products to save them here for outfit creation.</p>
            </div>
          ) : (
            <div className="masonry-container">
              {likedProducts.map(product => {
                const isSelected = selectedProducts.some(p => p.id === product.id);
                const imageUrl = product.images?.[0];
                if (!imageUrl) return null;
                
                return (
                  <div
                    key={product.id}
                    className={`masonry-item ${isSelected ? 'product-card selected' : 'product-card'}`}
                    onClick={(e) => {
                      if (isOutfitMode && !viewOutfitId) {
                        toggleProductSelection(product);
                      } else {
                        router.push(`/products/${product.id}`);
                      }
                    }}
                  >
                    <img 
                      src={imageUrl} 
                      alt={product.title}
                      className="product-image"
                      style={{ width: '100%', height: 'auto', display: 'block' }}
                    />
                    {isSelected && (
                      <div className="absolute top-3 right-3 bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg z-10">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    <div className="product-overlay">
                      <div className="product-overlay-text">{product.title}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          // Show all products
          loading && products.length === 0 ? (
            <div className="text-center py-12 text-gray-600">Loading products...</div>
          ) : (
            <>
              <div className="masonry-container">
                {products.map(product => {
                  const isSelected = selectedProducts.some(p => p.id === product.id);
                  const imageUrl = product.images?.[0];
                  if (!imageUrl) return null;
                  
                  return (
                    <div
                      key={product.id}
                      className={`masonry-item ${isSelected ? 'product-card selected' : 'product-card'}`}
                      onClick={(e) => {
                        if (isOutfitMode && !viewOutfitId) {
                          toggleProductSelection(product);
                        } else {
                          router.push(`/products/${product.id}`);
                        }
                      }}
                    >
                      <img 
                        src={imageUrl} 
                        alt={product.title}
                        className="product-image"
                        style={{ width: '100%', height: 'auto', display: 'block' }}
                      />
                      {isSelected && (
                        <div className="absolute top-3 right-3 bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg z-10">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                      <div className="product-overlay">
                        <div className="product-overlay-text">{product.title}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {hasMore && !loading && (
                <div className="text-center py-8">
                  <button
                    onClick={handleLoadMore}
                    className="bg-white px-8 py-3 rounded-full border border-gray-300 hover:bg-gray-50 font-medium text-sm shadow-sm transition"
                  >
                    Load More
                  </button>
                </div>
              )}
            </>
          )
        )}
      </main>
    </div>
  );
}