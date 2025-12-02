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
        setShowCreateModal(false);
        setNewOutfit({ name: '', description: '' });
        fetchClosetData();
      }
    } catch (error) {
      console.error('Error creating outfit:', error);
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
                className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="h-48 bg-gradient-to-br from-pink-400 to-orange-500 flex items-center justify-center">
                  <span className="text-6xl">👔</span>
                </div>

                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-2">{outfit.name}</h3>
                  {outfit.description && (
                    <p className="text-gray-600 text-sm mb-3">{outfit.description}</p>
                  )}
                  
                  <div className="text-sm text-gray-500 mb-4">
                    {outfit.product_count} item{outfit.product_count !== 1 ? 's' : ''}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/profile/closets/${closetId}/outfits/${outfit.id}`)}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
                    >
                      View Outfit
                    </button>
                    <button
                      onClick={() => handleDeleteOutfit(outfit.id)}
                      className="px-4 py-2 text-red-600 hover:bg-red-50 rounded text-sm"
                    >
                      Delete
                    </button>
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