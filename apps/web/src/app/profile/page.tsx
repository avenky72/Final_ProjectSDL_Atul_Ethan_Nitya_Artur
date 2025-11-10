'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

interface Closet {
  id: number;
  name: string;
  description: string;
  is_public: boolean;
  cover_image: string | null;
  outfit_count: number;
  created_at: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const [closets, setClosets] = useState<Closet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCloset, setNewCloset] = useState({
    name: '',
    description: '',
    is_public: false
  });

  useEffect(() => {
    if (!token) {
      router.push('/auth');
      return;
    }
    fetchClosets();
  }, [token]);

  const fetchClosets = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/closets', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      setClosets(data.closets || []);
    } catch (error) {
      console.error('Error fetching closets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCloset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3001/api/closets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newCloset)
      });
      
      if (res.ok) {
        setShowCreateModal(false);
        setNewCloset({ name: '', description: '', is_public: false });
        fetchClosets();
      }
    } catch (error) {
      console.error('Error creating closet:', error);
    }
  };

  const handleDeleteCloset = async (closetId: number) => {
    if (!confirm('Are you sure you want to delete this closet?')) return;
    
    try {
      const res = await fetch(`http://localhost:3001/api/closets/${closetId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        fetchClosets();
      }
    } catch (error) {
      console.error('Error deleting closet:', error);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="text-blue-600 hover:text-blue-800"
            >
              ← Back to Products
            </button>
            <h1 className="text-2xl font-bold">My Profile</h1>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-red-600 hover:text-red-800"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-2">Welcome, {user?.full_name || user?.email}!</h2>
          <p className="text-gray-600">{user?.email}</p>
        </div>

        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold">My Closets</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + Create New Closet
          </button>
        </div>

        {closets.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 mb-4">You don't have any closets yet.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700"
            >
              Create Your First Closet
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {closets.map((closet) => (
              <div
                key={closet.id}
                className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div
                  className="h-48 bg-gradient-to-br from-blue-400 to-purple-500"
                  style={{
                    backgroundImage: closet.cover_image ? `url(${closet.cover_image})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                />

                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-2">{closet.name}</h3>
                  {closet.description && (
                    <p className="text-gray-600 text-sm mb-3">{closet.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>{closet.outfit_count} outfit{closet.outfit_count !== 1 ? 's' : ''}</span>
                    <span>{closet.is_public ? '🌐 Public' : '🔒 Private'}</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/profile/closets/${closet.id}`)}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
                    >
                      View Closet
                    </button>
                    <button
                      onClick={() => handleDeleteCloset(closet.id)}
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
            <h3 className="text-xl font-bold mb-4">Create New Closet</h3>
            
            <form onSubmit={handleCreateCloset}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Closet Name *
                </label>
                <input
                  type="text"
                  value={newCloset.name}
                  onChange={(e) => setNewCloset({ ...newCloset, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="e.g., Winter Wardrobe"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  value={newCloset.description}
                  onChange={(e) => setNewCloset({ ...newCloset, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Describe your closet..."
                  rows={3}
                />
              </div>

              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newCloset.is_public}
                    onChange={(e) => setNewCloset({ ...newCloset, is_public: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">Make this closet public</span>
                </label>
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