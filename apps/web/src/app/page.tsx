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
  gender: string | null;
  colors: string[] | null;
  brand_name?: string;
  category_name?: string;
}

interface ProductsResponse { 
  products: Product[]; 
  pagination: { page: number; limit: number; total: number; pages: number; }; 
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

const colorHexMap: { [key: string]: string } = {
  'black': '#000000',
  'white': '#FFFFFF',
  'gray': '#9CA3AF',
  'grey': '#9CA3AF',
  'beige': '#D4C5B9',
  'brown': '#92684D',
  'red': '#DC2626',
  'pink': '#EC4899',
  'blue': '#3B82F6',
  'navy': '#1E3A8A',
  'green': '#16A34A',
  'yellow': '#EAB308',
  'orange': '#EA580C',
  'purple': '#9333EA',
  'tan': '#D2B48C',
  'cream': '#FFFDD0',
  'ivory': '#FFFFF0',
  'gold': '#FFD700',
  'silver': '#C0C0C0',
};

export default function Page() {
  const router = useRouter();
  const { user, logout } = useAuth();
  
  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  // Filter options from database
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [genders, setGenders] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  
  // Filter states
  const [selectedBrand, setSelectedBrand] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [selectedColor, setSelectedColor] = useState('');

  // Fetch filter options on mount
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [brandsRes, categoriesRes, gendersRes, colorsRes] = await Promise.all([
          fetch('http://localhost:3001/api/brands'),
          fetch('http://localhost:3001/api/categories'),
          fetch('http://localhost:3001/api/filters/genders'),
          fetch('http://localhost:3001/api/filters/colors'),
        ]);

        if (brandsRes.ok) setBrands(await brandsRes.json());
        if (categoriesRes.ok) setCategories(await categoriesRes.json());
        if (gendersRes.ok) setGenders(await gendersRes.json());
        if (colorsRes.ok) setColors(await colorsRes.json());
      } catch (error) {
        console.error('Error fetching filter options:', error);
      }
    };

    fetchFilterOptions();
  }, []);

  useEffect(() => {
    if (!user) {
      router.push('/auth');
      return;
    }

    const fetchProducts = async () => {
      if (page > 1) setLoadingMore(true);
      
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '24',
        });
        
        if (selectedCategory) params.append('category', selectedCategory);
        if (selectedBrand) params.append('brand', selectedBrand.toString());
        if (selectedGender) params.append('gender', selectedGender);
        
        const res = await fetch(`http://localhost:3001/api/products?${params}`);
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
  }, [user, router, page, selectedCategory, selectedBrand, selectedGender]);

  // Apply client-side color filter
  useEffect(() => {
    let filtered = [...products];

    if (selectedColor) {
      filtered = filtered.filter(product => 
        product.colors && product.colors.some(color => 
          color.toLowerCase().includes(selectedColor.toLowerCase())
        )
      );
    }

    setFilteredProducts(filtered);
  }, [products, selectedColor]);

  const handleBrandChange = (brandId: number | null) => {
    setSelectedBrand(brandId);
    setPage(1);
    setProducts([]);
    setLoading(true);
  };

  const handleCategoryChange = (slug: string) => {
    setSelectedCategory(slug);
    setPage(1);
    setProducts([]);
    setLoading(true);
  };

  const handleGenderChange = (value: string) => {
    setSelectedGender(value);
    setPage(1);
    setProducts([]);
    setLoading(true);
  };

  const handleColorChange = (value: string) => {
    setSelectedColor(value);
  };

  const clearAllFilters = () => {
    handleBrandChange(null);
    handleCategoryChange('');
    handleGenderChange('');
    handleColorChange('');
  };

  const getColorHex = (colorName: string): string => {
    const lowerColor = colorName.toLowerCase();
    return colorHexMap[lowerColor] || '#6B7280'; // Default gray if not found
  };

  if (!user) return null;

  if (loading) return <div className="flex justify-center items-center min-h-screen text-xl">Loading products...</div>;

  if (error) return (
    <div className="flex flex-col justify-center items-center min-h-screen gap-4">
      <div className="text-xl text-red-600">Error</div>
      <div className="text-gray-600">{error}</div>
      <button onClick={() => location.reload()} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Retry</button>
    </div>
  );

  const hasActiveFilters = selectedBrand || selectedCategory || selectedGender || selectedColor;

  return (
    <div>
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex justify-between items-center sticky top-0 z-50 shadow-sm">
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
        {/* Filter Section */}
        <div className="mb-8 space-y-6">
          {/* Brand Filter */}
          {brands.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold mb-3 text-gray-700 uppercase tracking-wider">Brand</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleBrandChange(null)}
                  className={`px-5 py-2 rounded-full font-medium transition-all ${
                    selectedBrand === null
                      ? 'bg-black text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
                  }`}
                >
                  All Brands
                </button>
                {brands.map((brand) => (
                  <button
                    key={brand.id}
                    onClick={() => handleBrandChange(brand.id)}
                    className={`px-5 py-2 rounded-full font-medium transition-all ${
                      selectedBrand === brand.id
                        ? 'bg-black text-white shadow-md'
                        : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {brand.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category Filter */}
          {categories.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold mb-3 text-gray-700 uppercase tracking-wider">Category</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleCategoryChange('')}
                  className={`px-5 py-2 rounded-full font-medium transition-all ${
                    selectedCategory === ''
                      ? 'bg-black text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
                  }`}
                >
                  All Categories
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryChange(category.slug)}
                    className={`px-5 py-2 rounded-full font-medium transition-all ${
                      selectedCategory === category.slug
                        ? 'bg-black text-white shadow-md'
                        : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Gender Filter */}
          {genders.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold mb-3 text-gray-700 uppercase tracking-wider">Gender</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleGenderChange('')}
                  className={`px-5 py-2 rounded-full font-medium transition-all ${
                    selectedGender === ''
                      ? 'bg-black text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
                  }`}
                >
                  All
                </button>
                {genders.map((gender) => (
                  <button
                    key={gender}
                    onClick={() => handleGenderChange(gender)}
                    className={`px-5 py-2 rounded-full font-medium transition-all capitalize ${
                      selectedGender === gender
                        ? 'bg-black text-white shadow-md'
                        : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {gender}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color Filter */}
          {colors.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold mb-3 text-gray-700 uppercase tracking-wider">Color</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleColorChange('')}
                  className={`px-4 py-2 rounded-full font-medium transition-all ${
                    selectedColor === ''
                      ? 'bg-black text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
                  }`}
                >
                  All Colors
                </button>
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleColorChange(color)}
                    className={`group relative px-4 py-2 rounded-full font-medium transition-all capitalize ${
                      selectedColor === color
                        ? 'bg-black text-white shadow-md'
                        : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className={`w-4 h-4 rounded-full ${color.toLowerCase() === 'white' ? 'border border-gray-300' : ''}`}
                        style={{ backgroundColor: getColorHex(color) }}
                      />
                      <span>{color}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="mb-6 flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-600">Active filters:</span>
            {selectedBrand && (
              <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                {brands.find(b => b.id === selectedBrand)?.name}
              </span>
            )}
            {selectedCategory && (
              <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                {categories.find(c => c.slug === selectedCategory)?.name}
              </span>
            )}
            {selectedGender && (
              <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full capitalize">
                {selectedGender}
              </span>
            )}
            {selectedColor && (
              <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full flex items-center gap-1 capitalize">
                <div 
                  className={`w-3 h-3 rounded-full ${selectedColor.toLowerCase() === 'white' ? 'border border-gray-300' : ''}`}
                  style={{ backgroundColor: getColorHex(selectedColor) }}
                />
                {selectedColor}
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="px-3 py-1 text-sm text-red-600 hover:text-red-700 underline"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Products Count */}
        <h1 className="text-3xl font-bold mb-8">
          Products ({filteredProducts.length})
        </h1>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map(product => (
            <div key={product.id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white">
              <div className="aspect-square bg-gray-50 flex items-center justify-center relative overflow-hidden group">
                {product.images && product.images[0] ? (
                  <img 
                    src={product.images[0]} 
                    alt={product.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                  />
                ) : (
                  <div className="text-gray-400">No image</div>
                )}
                {!product.in_stock && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                    Out of Stock
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold mb-2 line-clamp-2 text-gray-900">{product.title}</h3>
                {product.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>
                )}
                
                {/* Color dots if available */}
                {product.colors && product.colors.length > 0 && (
                  <div className="flex gap-1 mb-3">
                    {product.colors.slice(0, 5).map((color, idx) => (
                      <div
                        key={idx}
                        className={`w-5 h-5 rounded-full border ${color.toLowerCase() === 'white' ? 'border-gray-300' : 'border-gray-200'}`}
                        style={{ backgroundColor: getColorHex(color) }}
                        title={color}
                      />
                    ))}
                    {product.colors.length > 5 && (
                      <span className="text-xs text-gray-500 ml-1 self-center">+{product.colors.length - 5}</span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-bold text-gray-900">{product.currency} {product.price}</span>
                  {product.gender && (
                    <span className="text-xs text-gray-500 capitalize">{product.gender}</span>
                  )}
                </div>
                
                <a 
                  href={product.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block w-full text-center px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors"
                >
                  View Product
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Load More Button */}
        {hasMore && (
          <div className="flex justify-center mt-8">
            <button 
              onClick={() => setPage(p => p + 1)}
              disabled={loadingMore}
              className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 transition-colors"
            >
              {loadingMore ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}

        {/* No Results Message */}
        {!loading && filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600 mb-4">No products match your filters.</p>
            <button 
              onClick={clearAllFilters}
              className="px-6 py-2 bg-black text-white rounded hover:bg-gray-800"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}