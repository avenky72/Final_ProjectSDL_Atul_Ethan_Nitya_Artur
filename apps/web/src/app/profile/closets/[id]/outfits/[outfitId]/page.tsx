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
  const [closets, setClosets] = useState<Closet[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [moving, setMoving] = useState(false);
  const [isCopy, setIsCopy] = useState(false);
  const [editOutfit, setEditOutfit] = useState({
    name: '',
    description: ''
  });

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
        if (data.outfit) {
          setEditOutfit({
            name: data.outfit.name,
            description: data.outfit.description || ''
          });
        }
        
        // Also fetch closet info
        const closetRes = await fetch(`http://localhost:3001/api/closets/${closetId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (closetRes.ok) {
          const closetData = await closetRes.json();
          setCloset(closetData.closet);
        }
        
        // Fetch all closets for move functionality
        const closetsRes = await fetch('http://localhost:3001/api/closets', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (closetsRes.ok) {
          const closetsData = await closetsRes.json();
          setClosets(closetsData.closets || []);
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

  const handleMoveToCloset = async (targetClosetId: number) => {
    if (!outfit) return;
    
    setMoving(true);
    try {
      if (!isCopy) {
        // Move: First, delete from current closet
        const deleteRes = await fetch(`http://localhost:3001/api/closets/${closetId}/outfits/${outfitId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!deleteRes.ok) {
          throw new Error('Failed to remove outfit from current closet');
        }
      }
      
      // Create in new closet with same name and description
      const outfitName = isCopy ? `${outfit.name} (Copy)` : outfit.name;
      const createRes = await fetch(`http://localhost:3001/api/closets/${targetClosetId}/outfits`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: outfitName,
          description: outfit.description
        })
      });
      
      if (!createRes.ok) {
        throw new Error('Failed to create outfit in new closet');
      }
      
      const newOutfit = await createRes.json();
      
      // Add all products to the new outfit
      for (const product of products) {
        await fetch(`http://localhost:3001/api/closets/${targetClosetId}/outfits/${newOutfit.outfit.id}/products`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            product_id: product.id,
            position: product.position
          })
        });
      }
      
      if (isCopy) {
        // If copying, stay on current page
        setShowMoveModal(false);
        setIsCopy(false);
      } else {
        // If moving, navigate to new closet
        router.push(`/profile/closets/${targetClosetId}/outfits/${newOutfit.outfit.id}`);
      }
    } catch (error: any) {
      console.error('Error moving/copying outfit:', error);
      alert(`Error ${isCopy ? 'copying' : 'moving'} outfit: ${error.message || 'Unknown error'}`);
    } finally {
      setMoving(false);
    }
  };

  const handleUpdateOutfit = async () => {
    if (!editOutfit.name.trim()) {
      alert('Outfit name is required');
      return;
    }

    try {
      const res = await fetch(`http://localhost:3001/api/closets/${closetId}/outfits/${outfitId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editOutfit.name,
          description: editOutfit.description
        })
      });

      if (res.ok) {
        const data = await res.json();
        setOutfit(data.outfit);
        setShowRenameModal(false);
      } else {
        const errorText = await res.text();
        alert(`Failed to update outfit: ${errorText}`);
      }
    } catch (error: any) {
      console.error('Error updating outfit:', error);
      alert(`Error updating outfit: ${error.message || 'Unknown error'}`);
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
    <div className="min-h-screen relative" style={{ zIndex: 1 }}>
      <header className="bg-white/95 backdrop-blur-sm shadow-lg relative" style={{ zIndex: 10 }}>
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <button
                onClick={() => router.push(`/profile/closets/${closetId}`)}
                className="text-gray-600 hover:text-gray-900 mb-2 p-1 rounded-full hover:bg-gray-100 transition"
                aria-label="Back"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-3xl font-bold text-gray-900">{outfit.name}</h1>
              {outfit.description && (
                <p className="text-gray-700 mt-2">{outfit.description}</p>
              )}
              {closet && (
                <p className="text-sm text-gray-600 mt-1">From: {closet.name}</p>
              )}
            </div>
            {/* 3-dot menu button */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition"
                title="Menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
              
              {showMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowMenu(false)}
                  ></div>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setIsCopy(false);
                        setShowMoveModal(true);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg transition"
                    >
                      Move to Closet
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setIsCopy(true);
                        setShowMoveModal(true);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                    >
                      Copy to Closet
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowRenameModal(true);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                    >
                      Rename Outfit
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        handleDeleteOutfit();
                      }}
                      disabled={deleting}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 rounded-b-lg transition disabled:opacity-50"
                    >
                      {deleting ? 'Deleting...' : 'Delete Outfit'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 relative" style={{ zIndex: 1 }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Product List with descriptions */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4">Products ({products.length})</h3>
              
              {products.length === 0 ? (
                <p className="text-gray-500 text-sm">No products in this outfit.</p>
              ) : (
                <div className="space-y-4 relative">
                  {products.map((product, index) => (
                    <div key={product.id} className="relative">
                      {/* Connecting line (visual element) */}
                      {index < products.length - 1 && (
                        <div className="absolute left-8 top-20 w-0.5 h-4 bg-gray-300" style={{ zIndex: 0 }}></div>
                      )}
                      <div
                        onClick={() => router.push(`/products/${product.id}`)}
                        className="flex gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md cursor-pointer transition relative bg-white"
                        style={{ zIndex: 1 }}
                      >
                        <div className="w-20 h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0">
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
                          <p className="font-medium text-base mb-1">{product.title}</p>
                          {product.brand_name && (
                            <p className="text-sm text-gray-600 mb-1">{product.brand_name}</p>
                          )}
                          <p className="text-xs text-gray-500 mb-2">
                            {getCategoryLabel(product.category_id)}
                          </p>
                          <p className="text-sm font-semibold">
                            {product.currency || 'USD'} ${product.price?.toFixed(2) || '0.00'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Outfit Display - Just the preview, no boxes/labels, scrapbook style */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-4">
              {products.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>No products in this outfit yet.</p>
                </div>
              ) : (
                <div className="flex flex-col" style={{ gap: '1px' }}>
                  {/* Stack items vertically - clean scrapbook style, no labels/boxes */}
                  {(() => {
                    // Category order: Accessories (hats) → Outerwear → Tops → Bottoms → Dresses → Bags → Jewelry → Shoes (at bottom)
                    const categoryOrder = [4, 5, 1, 2, 6, 7, 8, 3];
                    const grouped: { [key: number]: Product[] } = {};
                    
                    products.forEach(product => {
                      const catId = product.category_id || 0;
                      if (!grouped[catId]) grouped[catId] = [];
                      grouped[catId].push(product);
                    });
                    
                    const sortedCategories = categoryOrder.filter(catId => grouped[catId]?.length > 0);
                    const allProducts: Product[] = [];
                    sortedCategories.forEach(catId => {
                      allProducts.push(...grouped[catId]);
                    });
                    
                    return allProducts.map((product) => (
                      <div
                        key={product.id}
                        className="w-full cursor-pointer hover:opacity-90 transition"
                        onClick={() => router.push(`/products/${product.id}`)}
                      >
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={product.images[0]}
                            alt={product.title}
                            className="w-full h-auto object-contain"
                            style={{ display: 'block' }}
                          />
                        ) : (
                          <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                            <span className="text-4xl opacity-30">👕</span>
                          </div>
                        )}
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Move/Copy to Closet Modal */}
      {showMoveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">{isCopy ? 'Copy' : 'Move'} Outfit to Another Closet</h3>
            <p className="text-gray-600 mb-4">Select a closet to {isCopy ? 'copy' : 'move'} this outfit to:</p>
            
            <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
              {closets.filter(c => c.id.toString() !== closetId).map(closet => (
                <button
                  key={closet.id}
                  onClick={() => handleMoveToCloset(closet.id)}
                  disabled={moving}
                  className="w-full text-left p-3 border rounded hover:bg-gray-50 hover:border-blue-500 transition disabled:opacity-50"
                >
                  <div className="font-medium">{closet.name}</div>
                  {closet.description && (
                    <div className="text-sm text-gray-500">{closet.description}</div>
                  )}
                </button>
              ))}
              {closets.filter(c => c.id.toString() !== closetId).length === 0 && (
                <p className="text-gray-500 text-sm">No other closets available.</p>
              )}
            </div>
            
            <button
              onClick={() => setShowMoveModal(false)}
              className="w-full px-4 py-2 border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Rename/Edit Outfit Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Edit Outfit</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Outfit Name *
              </label>
              <input
                type="text"
                value={editOutfit.name}
                onChange={(e) => setEditOutfit({ ...editOutfit, name: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="Outfit Name"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                value={editOutfit.description}
                onChange={(e) => setEditOutfit({ ...editOutfit, description: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="Outfit description..."
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowRenameModal(false);
                  if (outfit) {
                    setEditOutfit({
                      name: outfit.name,
                      description: outfit.description || ''
                    });
                  }
                }}
                className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateOutfit}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

