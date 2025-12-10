'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter, useParams } from 'next/navigation';

interface Outfit {
  id: number;
  name: string;
  description: string;
  product_count: number;
  created_at: string;
  preview_images?: string[];
}

interface Closet {
  id: number;
  name: string;
  description: string;
  is_public: boolean;
  created_at: string;
}

export default function ClosetPage() {
  const router = useRouter();
  const params = useParams();
  const { token } = useAuth();
  const closetId = params?.id;

  const [closet, setCloset] = useState<Closet | null>(null);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [editCloset, setEditCloset] = useState({
    name: '',
    description: ''
  });
  const [draggedOutfit, setDraggedOutfit] = useState<number | null>(null);
  const [draggedOverOutfit, setDraggedOverOutfit] = useState<number | null>(null);

  useEffect(() => {
    if (!token || !closetId) {
      router.push('/auth');
      return;
    }
    fetchClosetData();
  }, [token, closetId]);

  const fetchClosetData = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/closets/${closetId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setCloset(data.closet);
        setOutfits(data.outfits || []);
        if (data.closet) {
          setEditCloset({
            name: data.closet.name,
            description: data.closet.description || ''
          });
        }
      }
    } catch (error) {
      console.error('Error fetching closet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOutfitReorder = async (draggedId: number, targetId: number) => {
    if (!token) return;
    
    const draggedIndex = outfits.findIndex(o => o.id === draggedId);
    const targetIndex = outfits.findIndex(o => o.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    // Reorder in state immediately for responsive UI
    const newOutfits = [...outfits];
    const [removed] = newOutfits.splice(draggedIndex, 1);
    newOutfits.splice(targetIndex, 0, removed);
    setOutfits(newOutfits);
    
    // Save order to backend
    try {
      const outfitIds = newOutfits.map(o => o.id);
      const res = await fetch(`http://localhost:3001/api/closets/${closetId}/outfits/reorder`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ outfit_ids: outfitIds })
      });
      
      if (!res.ok) {
        // Revert on error
        setOutfits(outfits);
        console.error('Failed to save outfit order');
      }
    } catch (error) {
      // Revert on error
      setOutfits(outfits);
      console.error('Error saving outfit order:', error);
    }
  };

  const handleDeleteCloset = async () => {
    if (!confirm('Are you sure you want to delete this closet? This will also delete all outfits in this closet. This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`http://localhost:3001/api/closets/${closetId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        router.push('/profile');
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
      setDeleting(false);
    }
  };

  const handleUpdateCloset = async () => {
    if (!editCloset.name.trim()) {
      alert('Closet name is required');
      return;
    }

    try {
      const res = await fetch(`http://localhost:3001/api/closets/${closetId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editCloset.name,
          description: editCloset.description
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCloset(data.closet);
        setShowRenameModal(false);
      } else {
        const errorText = await res.text();
        alert(`Failed to update closet: ${errorText}`);
      }
    } catch (error: any) {
      console.error('Error updating closet:', error);
      alert(`Error updating closet: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDeleteOutfit = async (outfitId: number) => {
    if (!confirm('Are you sure you want to delete this outfit?')) return;
    
    try {
      const res = await fetch(`http://localhost:3001/api/closets/${closetId}/outfits/${outfitId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        fetchClosetData();
      }
    } catch (error) {
      console.error('Error deleting outfit:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!closet) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">Closet not found</div>
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
                onClick={() => router.push('/profile')}
                className="text-gray-600 hover:text-gray-900 mb-2 p-1 rounded-full hover:bg-gray-100 transition"
                aria-label="Back"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-3xl font-bold text-gray-900">{closet.name}</h1>
              {closet.description && (
                <p className="text-gray-700 mt-2">{closet.description}</p>
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
                        sessionStorage.setItem('outfitCreation', JSON.stringify({
                          closetId: closet.id,
                          closetName: closet.name,
                          mode: 'creating',
                          selectedProducts: []
                        }));
                        router.push('/?outfit-mode=true');
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg transition"
                    >
                      + New Outfit
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowRenameModal(true);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                    >
                      Rename Closet
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowRenameModal(true);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                    >
                      Edit Description
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        handleDeleteCloset();
                      }}
                      disabled={deleting}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 rounded-b-lg transition disabled:opacity-50"
                    >
                      {deleting ? 'Deleting...' : 'Delete Closet'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 relative" style={{ zIndex: 1 }}>

        {outfits.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <p className="text-gray-500 mb-4">No outfits in this closet yet.</p>
            <button
              onClick={() => {
                if (closet) {
                  sessionStorage.setItem('outfitCreation', JSON.stringify({
                    closetId: closet.id,
                    closetName: closet.name,
                    mode: 'creating',
                    selectedProducts: []
                  }));
                  router.push('/?outfit-mode=true');
                }
              }}
              className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700"
            >
              Create Your First Outfit
            </button>
          </div>
        ) : (
          <div className="masonry-container p-4">
            {outfits.map((outfit, index) => (
              <div
                key={outfit.id}
                draggable
                onDragStart={(e) => {
                  setDraggedOutfit(outfit.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (draggedOutfit !== outfit.id) {
                    setDraggedOverOutfit(outfit.id);
                  }
                }}
                onDragLeave={() => {
                  setDraggedOverOutfit(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedOutfit && draggedOutfit !== outfit.id) {
                    handleOutfitReorder(draggedOutfit, outfit.id);
                  }
                  setDraggedOutfit(null);
                  setDraggedOverOutfit(null);
                }}
                onDragEnd={() => {
                  setDraggedOutfit(null);
                  setDraggedOverOutfit(null);
                }}
                className="masonry-item product-card cursor-pointer"
                onClick={() => router.push(`/profile/closets/${closetId}/outfits/${outfit.id}`)}
                style={{
                  border: draggedOverOutfit === outfit.id ? '3px solid #3b82f6' : '3px solid #9ca3af',
                  borderRadius: '12px',
                  marginBottom: '24px',
                  overflow: 'hidden',
                  boxShadow: draggedOverOutfit === outfit.id ? '0 6px 16px rgba(59, 130, 246, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.15)',
                  backgroundColor: '#ffffff',
                  opacity: draggedOutfit === outfit.id ? 0.5 : 1,
                  transform: draggedOverOutfit === outfit.id ? 'translateY(-4px)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Scrapbook-style vertical layout - dynamic sizing, no whitespace */}
                {outfit.preview_images && outfit.preview_images.length > 0 ? (
                  <div className="flex flex-col bg-white" style={{ gap: '0px', padding: '4px' }}>
                    {/* Stack items vertically - images determine their own height dynamically */}
                    {outfit.preview_images.map((img: string, idx: number) => {
                      return (
                        <div 
                          key={idx} 
                          className="w-full bg-white"
                          style={{ 
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden'
                          }}
                        >
                          <img
                            src={img}
                            alt={`${outfit.name} item ${idx + 1}`}
                            className="w-full h-auto"
                            style={{ 
                              display: 'block',
                              objectFit: 'contain'
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-96 bg-gray-50 flex items-center justify-center">
                    <span className="text-4xl opacity-30">👔</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>


      {/* Rename/Edit Closet Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Edit Closet</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Closet Name *
              </label>
              <input
                type="text"
                value={editCloset.name}
                onChange={(e) => setEditCloset({ ...editCloset, name: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="Closet Name"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                value={editCloset.description}
                onChange={(e) => setEditCloset({ ...editCloset, description: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="Closet description..."
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowRenameModal(false);
                  if (closet) {
                    setEditCloset({
                      name: closet.name,
                      description: closet.description || ''
                    });
                  }
                }}
                className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateCloset}
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