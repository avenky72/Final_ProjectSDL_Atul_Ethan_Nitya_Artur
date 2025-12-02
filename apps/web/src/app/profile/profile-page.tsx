'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

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
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [closets, setClosets] = useState<Closet[]>([]);
  const [selectedCloset, setSelectedCloset] = useState<Closet | null>(null);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [showCreateCloset, setShowCreateCloset] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      router.push('/auth');
      return;
    }
    fetchClosets();
  }, [token, router]);

  // Fetch user's closets
  const fetchClosets = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/closets', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
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
      const res = await fetch(`http://localhost:3001/api/closets/${closetId}/outfits`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setOutfits(data.outfits || []);
    } catch (error) {
      console.error('Error fetching outfits:', error);
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
    try {
      const res = await fetch('http://localhost:3001/api/closets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: `${tag} ${name}`,
          description: `My ${tag.toLowerCase()} collection`,
          is_public: false
        })
      });
      
      if (res.ok) {
        await fetchClosets();
        setShowCreateCloset(false);
      }
    } catch (error) {
      console.error('Error creating closet:', error);
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
  const viewOutfit = async (outfitId: number) => {
    if (!selectedCloset) return;
    
    sessionStorage.setItem('viewOutfit', JSON.stringify({
      closetId: selectedCloset.id,
      outfitId: outfitId
    }));
    router.push(`/?view-outfit=${outfitId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">My Profile</h1>
            <p className="text-gray-600">Welcome back, {user?.email}</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="bg-gray-100 px-4 py-2 rounded hover:bg-gray-200"
          >
            Browse Products
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Closets Grid View */}
        {!selectedCloset && (
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
                <div>
                  <h2 className="text-2xl font-bold">{selectedCloset.name}</h2>
                  {selectedCloset.description && (
                    <p className="text-gray-600 mt-2">{selectedCloset.description}</p>
                  )}
                </div>
                <button
                  onClick={startOutfitCreation}
                  className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800"
                >
                  + Create New Outfit
                </button>
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
                    className="bg-white border rounded-lg p-4 hover:shadow-lg transition cursor-pointer"
                    onClick={() => viewOutfit(outfit.id)}
                  >
                    <div className="h-32 bg-gray-100 rounded mb-3 grid grid-cols-2 gap-1 p-2">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-gray-200 rounded"></div>
                      ))}
                    </div>
                    <h3 className="font-medium">{outfit.name}</h3>
                    <p className="text-sm text-gray-500">{outfit.product_count || 0} items</p>
                    <div className="mt-3 flex justify-between">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          viewOutfit(outfit.id);
                        }}
                        className="text-blue-600 text-sm hover:underline"
                      >
                        View
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteOutfit(outfit.id);
                        }}
                        className="text-red-500 text-sm hover:underline"
                      >
                        Delete
                      </button>
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