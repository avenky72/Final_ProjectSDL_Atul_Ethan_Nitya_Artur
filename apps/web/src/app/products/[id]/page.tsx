'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getProduct } from '@/lib/api';

interface Product {
  id: number;
  title: string;
  description: string | null;
  url: string;
  price: number;
  currency: string;
  gender: string | null;
  colors: string[] | null;
  sizes: string[] | null;
  images: string[] | null;
  brand_id: number | null;
  category_id: number | null;
  brand_name?: string;
  category_name?: string;
}

interface Closet {
  id: number;
  name: string;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuth();
  const productId = params?.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [closets, setClosets] = useState<Closet[]>([]);
  const [showClosetDropdown, setShowClosetDropdown] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    if (productId) {
      fetchProduct();
      if (user && token) {
        fetchClosets();
        checkLikedStatus();
      }
    }
  }, [productId, user, token]);

  const fetchProduct = async () => {
    try {
      const data = await getProduct(Number(productId));
      setProduct(data);
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClosets = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/closets', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setClosets(data.closets || []);
    } catch (error) {
      console.error('Error fetching closets:', error);
    }
  };

  const checkLikedStatus = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/products/${productId}/liked`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked || false);
      }
    } catch (error) {
      // Like endpoint might not exist yet, that's okay
    }
  };

  const toggleLike = async () => {
    if (!user || !token) {
      router.push('/auth');
      return;
    }

    try {
      const method = liked ? 'DELETE' : 'POST';
      const res = await fetch(`http://localhost:3001/api/products/${productId}/like`, {
        method,
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setLiked(!liked);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const addToCloset = async (closetId: number) => {
    if (!user || !token) {
      router.push('/auth');
      return;
    }

    try {
      // First, we need to create an outfit or add directly to closet
      // For now, let's add to a default "Favorites" outfit or create one
      const res = await fetch(`http://localhost:3001/api/closets/${closetId}/add-product`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ product_id: productId })
      });

      if (res.ok) {
        setShowClosetDropdown(false);
        alert('Product added to closet!');
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to add product to closet');
      }
    } catch (error) {
      console.error('Error adding to closet:', error);
      alert('Failed to add product to closet');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Product not found</div>
      </div>
    );
  }

  const images = product.images || [];
  const mainImage = images[selectedImageIndex] || images[0];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b px-4 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-black"
          >
            ← Back
          </button>
          <h1 className="text-xl font-bold">Product Details</h1>
          <div className="w-20"></div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Gallery */}
          <div>
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
              {mainImage ? (
                <img
                  src={mainImage}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No image available
                </div>
              )}
            </div>
            
            {/* Thumbnail Gallery */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`flex-shrink-0 w-20 h-20 rounded overflow-hidden border-2 ${
                      selectedImageIndex === idx ? 'border-black' : 'border-transparent'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${product.title} view ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <h1 className="text-3xl font-bold mb-2">{product.title}</h1>
            
            {product.brand_name && (
              <p className="text-lg text-gray-600 mb-4">{product.brand_name}</p>
            )}

            <div className="mb-6">
              <p className="text-3xl font-bold">${product.price}</p>
              <p className="text-sm text-gray-500">{product.currency}</p>
            </div>

            {product.description && (
              <div className="mb-6">
                <h2 className="font-semibold mb-2">Description</h2>
                <p className="text-gray-700">{product.description}</p>
              </div>
            )}

            {/* Colors */}
            {product.colors && product.colors.length > 0 && (
              <div className="mb-6">
                <h2 className="font-semibold mb-2">Colors</h2>
                <div className="flex gap-2 flex-wrap">
                  {product.colors.map((color, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-gray-100 rounded-full text-sm"
                    >
                      {color}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Sizes */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="mb-6">
                <h2 className="font-semibold mb-2">Sizes</h2>
                <div className="flex gap-2 flex-wrap">
                  {product.sizes.map((size, idx) => (
                    <button
                      key={idx}
                      className="px-4 py-2 border rounded hover:bg-gray-50"
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Gender */}
            {product.gender && (
              <div className="mb-6">
                <p className="text-sm text-gray-600">Gender: {product.gender}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={toggleLike}
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition ${
                  liked
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {liked ? '❤️ Liked' : '🤍 Like'}
              </button>

              <div className="relative flex-1">
                <button
                  onClick={() => {
                    if (!user) {
                      router.push('/auth');
                      return;
                    }
                    setShowClosetDropdown(!showClosetDropdown);
                  }}
                  className="w-full px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800"
                >
                  ➕ Add to Closet
                </button>

                {showClosetDropdown && closets.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                    {closets.map(closet => (
                      <button
                        key={closet.id}
                        onClick={() => addToCloset(closet.id)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0"
                      >
                        {closet.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* View Original */}
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center px-6 py-3 border rounded-lg hover:bg-gray-50"
            >
              View on Original Site →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

