'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';

// Predefined tags/aesthetics for closets
const CLOSET_TAGS = [
  'Winter', 'Summer', 'Spring', 'Fall',
  'Casual', 'Formal', 'Business', 'Athletic',
  'Minimalist', 'Vintage', 'Streetwear', 'Boho'
];

interface Closet {
  id: number;
  name: string;
  description: string;
  is_public: boolean;
  cover_image: string | null;
  outfit_count: number;
  created_at: string;
}

interface Outfit {
  id: number;
  name: string;
  description: string;
  product_count: number;
  created_at: string;
  preview_images?: string[];
}

interface Product {
  id: number;
  title: string;
  description: string;
  price: number;
  currency: string;
  images: string[];
  url: string;
  brand_id?: number;
  category_id?: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const [closets, setClosets] = useState<Closet[]>([]);
  const [selectedCloset, setSelectedCloset] = useState<Closet | null>(null);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [likedProducts, setLikedProducts] = useState<Product[]>([]);
  const [showCreateCloset, setShowCreateCloset] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLikedProducts, setShowLikedProducts] = useState(false);
  const [deletingCloset, setDeletingCloset] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push('/auth');
      return;
    }
    fetchClosets();
    fetchLikedProducts();
  }, [token, router]);

  // Fetch user's closets
  const fetchClosets = async () => {
    if (!token) {
      console.error('No token available');
      setLoading(false);
      return;
    }
    
    try {
      const res = await fetch('http://localhost:3001/api/closets', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: errorText || `HTTP ${res.status}: ${res.statusText}` };
        }
        console.error('Failed to fetch closets:', res.status, error);
        return;
      }
      
      const data = await res.json();
      setClosets(data.closets || []);
    } catch (error) {
      console.error('Error fetching closets:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch outfits for a closet
  const fetchOutfits = async (closetId: number) => {
    try {
      const res = await fetch(`http://localhost:3001/api/closets/${closetId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setOutfits(data.outfits || []);
      } else {
        console.error('Failed to fetch outfits:', res.status);
        setOutfits([]);
      }
    } catch (error) {
      console.error('Error fetching outfits:', error);
      setOutfits([]);
    }
  };

  // Fetch liked products
  const fetchLikedProducts = async () => {
    if (!token) return;
    
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
      setLikedProducts([]); // Set empty array on error
    }
  };

  // Delete closet
  const handleDeleteCloset = async (closetId: number) => {
    if (!confirm('Are you sure you want to delete this closet? This will also delete all outfits in this closet. This action cannot be undone.')) {
      return;
    }

    setDeletingCloset(true);
    try {
      const res = await fetch(`http://localhost:3001/api/closets/${closetId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        // Refresh closets list
        await fetchClosets();
        // Clear selected closet if it was the deleted one
        if (selectedCloset && selectedCloset.id === closetId) {
          setSelectedCloset(null);
          setOutfits([]);
        }
      } else {
        const errorText = await res.text();
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: errorText || `HTTP ${res.status}: ${res.statusText}` };
        }
        alert(`Failed to delete closet: ${error.error || `HTTP ${res.status}`}`);
      }
    } catch (error: any) {
      console.error('Error deleting closet:', error);
      alert(`Error deleting closet: ${error.message || 'Unknown error'}`);
    } finally {
      setDeletingCloset(false);
    }
  };

  // Handle closet selection
  const handleClosetClick = async (closet: Closet) => {
    setSelectedCloset(closet);
    await fetchOutfits(closet.id);
  };

  // Start outfit creation - navigate to home with context
  const startOutfitCreation = () => {
    if (!selectedCloset) return;
    
    // Store outfit creation context in sessionStorage
    sessionStorage.setItem('outfitCreation', JSON.stringify({
      closetId: selectedCloset.id,
      closetName: selectedCloset.name,
      mode: 'creating',
      selectedProducts: []
    }));
    
    // Navigate to home page in outfit creation mode
    router.push('/?outfit-mode=true');
  };

  // Create a new closet
  const createCloset = async (name: string, tag: string) => {
    if (!token) {
      alert('Please log in to create a closet');
      return;
    }
    
    try {
      const res = await fetch('http://localhost:3001/api/closets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name, // Just use the name, tag is only for organization/filtering
          description: `My ${tag.toLowerCase()} collection`,
          is_public: false
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log('Closet created successfully:', data);
        await fetchClosets();
        setShowCreateCloset(false);
      } else {
        const errorText = await res.text();
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: errorText || `HTTP ${res.status}: ${res.statusText}` };
        }
        console.error('Failed to create closet:', res.status, error);
        alert(`Failed to create closet: ${error.error || `HTTP ${res.status}`}`);
      }
    } catch (error) {
      console.error('Error creating closet:', error);
      alert(`Error creating closet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Delete outfit
  const deleteOutfit = async (outfitId: number) => {
    if (!confirm('Delete this outfit?') || !selectedCloset) return;
    
    try {
      const res = await fetch(`http://localhost:3001/api/closets/${selectedCloset.id}/outfits/${outfitId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchOutfits(selectedCloset.id);
      }
    } catch (error) {
      console.error('Error deleting outfit:', error);
    }
  };

  // View outfit details
  const viewOutfit = (outfitId: number) => {
    if (!selectedCloset) return;
    router.push(`/profile/closets/${selectedCloset.id}/outfits/${outfitId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative" style={{ zIndex: 1 }}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div 
              className="flex items-center cursor-pointer hover:opacity-80 transition"
              onClick={() => router.push('/')}
            >
              <Logo className="w-10 h-10 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">My Profile</h1>
              <p className="text-sm text-gray-600 hidden sm:inline">Welcome back, {user?.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/')}
              className="p-2 rounded-full hover:bg-gray-100 transition"
              aria-label="Home"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </button>
            <button
              onClick={() => {
                logout();
                router.push('/auth');
              }}
              className="p-2 rounded-full hover:bg-gray-100 transition"
              aria-label="Sign out"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Tabs for Closets and Liked Products */}
        {!selectedCloset && (
          <div className="mb-6 border-b">
            <div className="flex gap-4">
              <button
                onClick={() => setShowLikedProducts(false)}
                className={`pb-3 px-2 font-medium ${
                  !showLikedProducts
                    ? 'border-b-2 border-black text-black'
                    : 'text-gray-500 hover:text-black'
                }`}
              >
                My Closets
              </button>
              <button
                onClick={() => setShowLikedProducts(true)}
                className={`pb-3 px-2 font-medium ${
                  showLikedProducts
                    ? 'border-b-2 border-black text-black'
                    : 'text-gray-500 hover:text-black'
                }`}
              >
                Liked Products ({likedProducts.length})
              </button>
            </div>
          </div>
        )}

        {/* Liked Products View */}
        {!selectedCloset && showLikedProducts && (
          <div>
            {likedProducts.length === 0 ? (
              <div className="bg-white rounded-lg p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="w-24 h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium mb-2">No liked products yet</h3>
                <p className="text-gray-500 mb-4">Start liking products to save them here</p>
                <button
                  onClick={() => router.push('/')}
                  className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800"
                >
                  Browse Products
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {likedProducts.map(product => (
                  <div
                    key={product.id}
                    onClick={() => router.push(`/products/${product.id}`)}
                    className="bg-white rounded-lg border hover:shadow-lg transition cursor-pointer overflow-hidden"
                  >
                    <div className="h-48 bg-gray-100 flex items-center justify-center overflow-hidden">
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={product.images[0]}
                          alt={product.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-4xl opacity-30">👕</span>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium text-sm line-clamp-2 mb-1">{product.title}</h3>
                      <p className="text-sm font-semibold text-black">
                        {product.currency || 'USD'} ${product.price?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Closets Grid View */}
        {!selectedCloset && !showLikedProducts && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">My Closets</h2>
              <button
                onClick={() => setShowCreateCloset(true)}
                className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
              >
                + New Closet
              </button>
            </div>

            {closets.length === 0 ? (
              <div className="bg-white rounded-lg p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="w-24 h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium mb-2">No closets yet</h3>
                <p className="text-gray-500 mb-4">Create your first closet to start organizing outfits</p>
                <button
                  onClick={() => setShowCreateCloset(true)}
                  className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800"
                >
                  Create Your First Closet
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {closets.map(closet => (
                  <div
                    key={closet.id}
                    onClick={() => handleClosetClick(closet)}
                    className="bg-white rounded-lg border hover:shadow-lg transition cursor-pointer overflow-hidden"
                  >
                    <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <span className="text-5xl opacity-50">👗</span>
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium text-lg">{closet.name}</h3>
                      {closet.description && (
                        <p className="text-sm text-gray-500 mt-1">{closet.description}</p>
                      )}
                      <div className="flex justify-between items-center mt-3">
                        <span className="text-sm text-gray-600">{closet.outfit_count || 0} outfits</span>
                        <span className="text-xs text-gray-400">
                          {closet.is_public ? '🌐 Public' : '🔒 Private'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Selected Closet View */}
        {selectedCloset && (
          <div>
            <div className="flex items-center gap-4 mb-6">
              <button 
                onClick={() => {
                  setSelectedCloset(null);
                  setOutfits([]);
                }}
                className="text-gray-600 hover:text-black"
              >
                ← Back to Closets
              </button>
            </div>

            <div className="bg-white rounded-lg p-6 mb-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">{selectedCloset.name}</h2>
                  {selectedCloset.description && (
                    <p className="text-gray-600 mt-2">{selectedCloset.description}</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => router.push(`/profile/closets/${selectedCloset.id}`)}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    View Full Closet
                  </button>
                  <button
                    onClick={startOutfitCreation}
                    className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800"
                  >
                    + Create New Outfit
                  </button>
                  <button
                    onClick={() => handleDeleteCloset(selectedCloset.id)}
                    disabled={deletingCloset}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingCloset ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>

            {/* Outfits Grid */}
            {outfits.length === 0 ? (
              <div className="bg-white rounded-lg p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium mb-2">No outfits yet</h3>
                <p className="text-gray-500 mb-4">Start creating outfits from your favorite products</p>
                <button
                  onClick={startOutfitCreation}
                  className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800"
                >
                  Create Your First Outfit
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {outfits.map(outfit => (
                  <div
                    key={outfit.id}
                    className="bg-white border rounded-lg overflow-hidden hover:shadow-lg transition cursor-pointer"
                    onClick={() => viewOutfit(outfit.id)}
                  >
                    {/* Tall vertical preview - iPhone-like figure layout */}
                    <div className="h-80 bg-gray-50 relative overflow-hidden">
                      {outfit.preview_images && outfit.preview_images.length > 0 ? (
                        <div className="h-full flex flex-col gap-1 p-2">
                          {/* Top section - Accessories/Headwear */}
                          <div className="h-12 flex gap-1">
                            {outfit.preview_images.slice(0, 2).map((img: string, idx: number) => (
                              <img
                                key={idx}
                                src={img}
                                alt={`${outfit.name} preview ${idx + 1}`}
                                className="w-1/2 h-full object-cover rounded"
                              />
                            ))}
                            {outfit.preview_images.length < 2 && (
                              <div className="w-1/2 bg-gray-200 rounded"></div>
                            )}
                          </div>
                          {/* Middle section - Top */}
                          <div className="flex-1 flex gap-1">
                            {outfit.preview_images.slice(2, 4).map((img: string, idx: number) => (
                              <img
                                key={idx + 2}
                                src={img}
                                alt={`${outfit.name} preview ${idx + 3}`}
                                className="w-1/2 h-full object-cover rounded"
                              />
                            ))}
                            {outfit.preview_images.length < 4 && (
                              <div className="w-1/2 bg-gray-200 rounded"></div>
                            )}
                          </div>
                          {/* Bottom section - Bottoms/Shoes */}
                          <div className="h-16 flex gap-1">
                            {outfit.preview_images.length > 4 ? (
                              outfit.preview_images.slice(4, 6).map((img: string, idx: number) => (
                                <img
                                  key={idx + 4}
                                  src={img}
                                  alt={`${outfit.name} preview ${idx + 5}`}
                                  className="w-1/2 h-full object-cover rounded"
                                />
                              ))
                            ) : (
                              <>
                                {outfit.preview_images.slice(0, 2).map((img: string, idx: number) => (
                                  <img
                                    key={idx}
                                    src={img}
                                    alt={`${outfit.name} preview ${idx + 1}`}
                                    className="w-1/2 h-full object-cover rounded"
                                  />
                                ))}
                              </>
                            )}
                            {outfit.preview_images.length < 2 && (
                              <div className="w-1/2 bg-gray-200 rounded"></div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <span className="text-4xl opacity-30">👔</span>
                        </div>
                      )}
                    </div>
                    <div className="p-3 border-t">
                      <h3 className="font-medium text-sm mb-1">{outfit.name}</h3>
                      <p className="text-xs text-gray-500">{outfit.product_count || 0} items</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Closet Modal */}
      {showCreateCloset && (
        <CreateClosetModal
          tags={CLOSET_TAGS}
          onClose={() => setShowCreateCloset(false)}
          onCreate={createCloset}
        />
      )}
    </div>
  );
}

// Create Closet Modal Component
interface CreateClosetModalProps {
  tags: string[];
  onClose: () => void;
  onCreate: (name: string, tag: string) => void;
}

function CreateClosetModal({ tags, onClose, onCreate }: CreateClosetModalProps) {
  const [name, setName] = useState('');
  const [selectedTag, setSelectedTag] = useState(tags[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name.trim(), selectedTag);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96">
        <h3 className="text-lg font-bold mb-4">Create New Closet</h3>
        
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Closet Name (e.g., 'Favorites')"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border rounded mb-4"
            autoFocus
            required
          />
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Select Tag:</label>
            <select 
              value={selectedTag} 
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full p-2 border rounded"
            >
              {tags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
          
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-black text-white px-4 py-2 rounded flex-1 hover:bg-gray-800"
            >
              Create
            </button>
            <button
              type="button"
              onClick={onClose}
              className="border px-4 py-2 rounded flex-1 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}