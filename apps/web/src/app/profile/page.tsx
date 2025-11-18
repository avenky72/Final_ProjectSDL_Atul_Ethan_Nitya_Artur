'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter, useSearchParams } from 'next/navigation';

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
  const { user, token, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  // Filter states
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  
  // Outfit creation mode
  const isOutfitMode = searchParams.get('outfit-mode') === 'true';
  const viewOutfitId = searchParams.get('view-outfit');
  const [outfitCreation, setOutfitCreation] = useState<OutfitCreation | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [outfitName, setOutfitName] = useState('');

  useEffect(() => {
    fetchProducts();
    fetchFilters();
    
    // Check if we're in outfit creation mode
    if (isOutfitMode) {
      const creation = sessionStorage.getItem('outfitCreation');
      if (creation) {
        const parsed = JSON.parse(creation);
        setOutfitCreation(parsed);
        setSelectedProducts(parsed.selectedProducts || []);
      }
    }
    
    // Check if viewing an outfit
    if (viewOutfitId) {
      fetchOutfitDetails(viewOutfitId);
    }
  }, [isOutfitMode, viewOutfitId]);

  const fetchProducts = async () => {
    try {
      let url = 'http://localhost:3001/api/products?';
      if (selectedCategory) url += `category=${selectedCategory}&`;
      if (selectedBrand) url += `brand=${selectedBrand}&`;
      if (priceRange.min) url += `minPrice=${priceRange.min}&`;
      if (priceRange.max) url += `maxPrice=${priceRange.max}&`;
      
      const res = await fetch(url);
      const data = await res.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilters = async () => {
    try {
      const [catRes, brandRes] = await Promise.all([
        fetch('http://localhost:3001/api/categories'),
        fetch('http://localhost:3001/api/brands')
      ]);
      
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData.categories || catData || []);
      }
      
      if (brandRes.ok) {
        const brandData = await brandRes.json();
        setBrands(brandData.brands || brandData || []);
      }
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  };

  const fetchOutfitDetails = async (outfitId: string) => {
    try {
      const outfit = sessionStorage.getItem('viewOutfit');
      if (!outfit) return;
      
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

  // Toggle product selection for outfit
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

  // Save outfit
  const saveOutfit = async () => {
    if (!outfitName || selectedProducts.length === 0 || !outfitCreation) {
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

  // Cancel outfit creation
  const cancelOutfitCreation = () => {
    sessionStorage.removeItem('outfitCreation');
    sessionStorage.removeItem('viewOutfit');
    router.push('/profile');
  };

  // Apply filters
  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, selectedBrand, priceRange]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b px-4 py-4 sticky top-0 bg-white z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Couture Closet</h1>
          <div className="flex gap-4 items-center">
            {user && <span className="text-sm text-gray-600">{user.email}</span>}
            <button
              onClick={() => router.push(user ? '/profile' : '/auth')}
              className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
            >
              {user ? 'My Profile' : 'Sign In'}
            </button>
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
                  className="px-3 py-1 border rounded"
                />
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm">
                {selectedProducts.length} items selected
              </span>
              {!viewOutfitId && (
                <button
                  onClick={saveOutfit}
                  disabled={selectedProducts.length === 0 || !outfitName}
                  className="bg-blue-600 text-white px-4 py-1 rounded disabled:bg-gray-400 hover:bg-blue-700"
                >
                  Save Outfit
                </button>
              )}
              <button
                onClick={cancelOutfitCreation}
                className="text-gray-600 hover:text-black"
              >
                {viewOutfitId ? 'Back' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto flex gap-6 px-4 py-6">
        {/* Filters Sidebar */}
        <aside className="w-64 flex-shrink-0">
          <h3 className="font-semibold mb-4">Filters</h3>
          
          {/* Category Filter */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Brand Filter */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Brand</label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">All Brands</option>
              {brands.map(brand => (
                <option key={brand.id} value={brand.id}>{brand.name}</option>
              ))}
            </select>
          </div>

          {/* Price Range */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Price Range</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={priceRange.min}
                onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                className="w-1/2 p-2 border rounded"
              />
              <input
                type="number"
                placeholder="Max"
                value={priceRange.max}
                onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                className="w-1/2 p-2 border rounded"
              />
            </div>
          </div>

          <button
            onClick={() => {
              setSelectedCategory('');
              setSelectedBrand('');
              setPriceRange({ min: '', max: '' });
            }}
            className="text-sm text-gray-600 hover:text-black underline"
          >
            Clear all filters
          </button>
        </aside>

        {/* Products Grid */}
        <main className="flex-1">
          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map(product => {
                const isSelected = selectedProducts.some(p => p.id === product.id);
                return (
                  <div
                    key={product.id}
                    onClick={() => (isOutfitMode && !viewOutfitId) ? toggleProductSelection(product) : null}
                    className={`
                      border rounded-lg p-3 transition
                      ${isSelected ? 'border-blue-500 bg-blue-50' : 'hover:shadow-lg'}
                      ${(isOutfitMode && !viewOutfitId) ? 'cursor-pointer' : ''}
                    `}
                  >
                    <div className="aspect-square bg-gray-200 rounded mb-2 relative">
                      {product.images?.[0] && (
                        <img 
                          src={product.images[0]} 
                          alt={product.title}
                          className="w-full h-full object-cover rounded"
                        />
                      )}
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center">
                          ✓
                        </div>
                      )}
                    </div>
                    <h3 className="font-medium text-sm truncate">{product.title}</h3>
                    <p className="text-gray-600">${product.price}</p>
                    {product.brand_name && (
                      <p className="text-xs text-gray-500">{product.brand_name}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Selected Products Bar (Mobile/Bottom) */}
      {isOutfitMode && !viewOutfitId && selectedProducts.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 md:hidden">
          <div className="flex items-center justify-between">
            <span className="font-medium">{selectedProducts.length} items</span>
            <button
              onClick={saveOutfit}
              disabled={!outfitName}
              className="bg-blue-600 text-white px-6 py-2 rounded disabled:bg-gray-400"
            >
              Save Outfit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}