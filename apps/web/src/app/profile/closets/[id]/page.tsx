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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newOutfit, setNewOutfit] = useState({
    name: '',
    description: ''
  });

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
      const data = await res.json();
      setCloset(data.closet);
      setOutfits(data.outfits || []);
    } catch (error) {
      console.error('Error fetching closet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOutfit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      alert('Please log in to create an outfit');
      return;
    }
    
    try {
      const res = await fetch(`http://localhost:3001/api/closets/${closetId}/outfits`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newOutfit)
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log('Outfit created successfully:', data);
        setShowCreateModal(false);
        setNewOutfit({ name: '', description: '' });
        fetchClosetData();
      } else {
        const errorText = await res.text();
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: errorText || `HTTP ${res.status}: ${res.statusText}` };
        }
        console.error('Failed to create outfit:', res.status, error);
        alert(`Failed to create outfit: ${error.error || `HTTP ${res.status}`}`);
      }
    } catch (error: any) {
      console.error('Error creating outfit:', error);
      alert(`Error creating outfit: ${error.message || 'Unknown error'}`);
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <button
                onClick={() => router.push('/profile')}
                className="text-blue-600 hover:text-blue-800 mb-2"
              >
                ← Back to Profile
              </button>
              <h1 className="text-3xl font-bold">{closet.name}</h1>
              {closet.description && (
                <p className="text-gray-600 mt-2">{closet.description}</p>
              )}
              <div className="mt-2 text-sm text-gray-500">
                {closet.is_public ? '🌐 Public' : '🔒 Private'}
              </div>
            </div>
            <button
              onClick={handleDeleteCloset}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? 'Deleting...' : 'Delete Closet'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Outfits</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + Create New Outfit
          </button>
        </div>

        {outfits.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 mb-4">No outfits in this closet yet.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700"
            >
              Create Your First Outfit
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {outfits.map((outfit) => (
              <div
                key={outfit.id}
                onClick={() => router.push(`/profile/closets/${closetId}/outfits/${outfit.id}`)}
                className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              >
                {/* Tall vertical preview - iPhone-like figure layout */}
                <div className="h-96 bg-gray-50 relative overflow-hidden">
                  {outfit.preview_images && outfit.preview_images.length > 0 ? (
                    <div className="h-full flex flex-col gap-1 p-2">
                      {/* Top section - Accessories/Headwear */}
                      <div className="h-16 flex gap-1">
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
                      <div className="h-20 flex gap-1">
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
                      <span className="text-6xl opacity-30">👔</span>
                    </div>
                  )}
                </div>

                <div className="p-4 border-t">
                  <h3 className="text-lg font-semibold mb-1">{outfit.name}</h3>
                  {outfit.description && (
                    <p className="text-gray-600 text-sm mb-2 line-clamp-2">{outfit.description}</p>
                  )}
                  <div className="text-sm text-gray-500">
                    {outfit.product_count} item{outfit.product_count !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Create New Outfit</h3>
            
            <form onSubmit={handleCreateOutfit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Outfit Name *
                </label>
                <input
                  type="text"
                  value={newOutfit.name}
                  onChange={(e) => setNewOutfit({ ...newOutfit, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="e.g., Cozy Office Look"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  value={newOutfit.description}
                  onChange={(e) => setNewOutfit({ ...newOutfit, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Describe your outfit..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}