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
  preview_images?: string[];
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

interface UserProfile {
  id: number;
  email: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [closets, setClosets] = useState<Closet[]>([]);
  const [likedProducts, setLikedProducts] = useState<Product[]>([]);
  const [showCreateCloset, setShowCreateCloset] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'closets' | 'liked'>('closets');
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [deletingCloset, setDeletingCloset] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push('/auth');
      return;
    }
    fetchProfile();
    fetchClosets();
    fetchLikedProducts();
  }, [token, router]);

  // Fetch user profile
  const fetchProfile = async () => {
    if (!token) return;
    try {
      // Add cache-busting timestamp to ensure fresh data
      const res = await fetch(`http://localhost:3001/api/profile?t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        const profileData = data.profile || { id: user?.id, email: user?.email, full_name: user?.full_name, username: null, avatar_url: null };
        setProfile(profileData);
        console.log('Profile fetched:', profileData);
      } else {
        const errorText = await res.text();
        console.error('Failed to fetch profile:', res.status, errorText);
        // Fallback to user data from auth
        setProfile({ id: user?.id, email: user?.email, full_name: user?.full_name, username: null, avatar_url: null });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Fallback to user data from auth
      setProfile({ id: user?.id, email: user?.email, full_name: user?.full_name, username: null, avatar_url: null });
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's closets
  const fetchClosets = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:3001/api/closets', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setClosets(data.closets || []);
      }
    } catch (error) {
      console.error('Error fetching closets:', error);
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
      }
    } catch (error) {
      console.error('Error fetching liked products:', error);
      setLikedProducts([]);
    }
  };

  // Delete closet
  const handleDeleteCloset = async (closetId: number) => {
    if (!confirm('Are you sure you want to delete this closet? This will also delete all outfits in this closet.')) {
      return;
    }
    setDeletingCloset(true);
    try {
      const res = await fetch(`http://localhost:3001/api/closets/${closetId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchClosets();
      }
    } catch (error) {
      console.error('Error deleting closet:', error);
    } finally {
      setDeletingCloset(false);
    }
  };

  // Create a new closet
  const createCloset = async (name: string, tag: string) => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:3001/api/closets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name,
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white relative" style={{ zIndex: 1 }}>
      {/* Header - Pinterest style */}
      <header className="sticky top-0 z-50 bg-white px-4 py-2">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div 
              className="flex items-center cursor-pointer hover:opacity-80 transition"
              onClick={() => router.push('/')}
            >
              <Logo className="w-10 h-10 text-black" />
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

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Profile Header Section - Pinterest Style - Left Aligned */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            {/* Profile Picture */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden border-2 border-gray-300">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name || 'Profile'} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">
                  {profile?.full_name || 'User'}
                </h1>
                <button
                  onClick={() => setShowEditProfile(true)}
                  className="px-4 py-2 border border-gray-300 rounded-full text-sm font-medium hover:bg-gray-50 transition whitespace-nowrap"
                >
                  Edit profile
                </button>
              </div>
              {profile?.username && (
                <p className="text-gray-600 mb-2">@{profile.username}</p>
              )}
              <div className="flex gap-6 text-sm text-gray-600">
                <span><strong className="text-black">{closets.length}</strong> Closets</span>
                <span><strong className="text-black">{likedProducts.length}</strong> Liked</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Buttons - Pinterest Style - Centered with spacing */}
        <div className="border-b border-gray-200 mb-6 mt-12">
          <div className="flex gap-8 justify-center">
            <button
              onClick={() => setActiveTab('closets')}
              className={`pb-3 px-1 font-semibold text-sm transition ${
                activeTab === 'closets'
                  ? 'border-b-2 border-black text-black'
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              Closets
            </button>
            <button
              onClick={() => setActiveTab('liked')}
              className={`pb-3 px-1 font-semibold text-sm transition ${
                activeTab === 'liked'
                  ? 'border-b-2 border-black text-black'
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              Liked Products
            </button>
          </div>
        </div>

        {/* Content Area */}
        {activeTab === 'closets' && (
          <div>
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
                  className="bg-black text-white px-6 py-2 rounded-full hover:bg-gray-800 transition"
                >
                  Create Your First Closet
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {closets.map(closet => (
                  <div
                    key={closet.id}
                    onClick={() => router.push(`/profile/closets/${closet.id}`)}
                    className="bg-white rounded-lg border hover:shadow-lg transition cursor-pointer overflow-hidden"
                  >
                    {/* Closet Preview - Show outfit previews if available */}
                    {closet.preview_images && closet.preview_images.length > 0 ? (
                      <div className="h-64 bg-gray-50 relative overflow-hidden">
                        <div className="h-full grid grid-cols-2 gap-1 p-1">
                          {closet.preview_images.slice(0, 4).map((img, idx) => (
                            <div key={idx} className="bg-white rounded overflow-hidden">
                              <img
                                src={img}
                                alt={`${closet.name} preview ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : closet.outfit_count > 0 ? (
                      // If closet has outfits but no preview images yet, show placeholder
                      <div className="h-64 bg-gray-50 relative overflow-hidden">
                        <div className="h-full flex items-center justify-center">
                          <span className="text-5xl opacity-30">👗</span>
                        </div>
                      </div>
                    ) : (
                      // Empty closet - show nothing (or minimal placeholder)
                      <div className="h-64 bg-gray-50 relative overflow-hidden"></div>
                    )}
                    <div className="p-4">
                      <h3 className="font-medium text-lg">{closet.name}</h3>
                      {closet.description && (
                        <p className="text-sm text-gray-500 mt-1">{closet.description}</p>
                      )}
                      <div className="flex justify-between items-center mt-3">
                        <span className="text-sm text-gray-600">{closet.outfit_count || 0} outfits</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'liked' && (
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
                  className="bg-black text-white px-6 py-2 rounded-full hover:bg-gray-800 transition"
                >
                  Browse Products
                </button>
              </div>
            ) : (
              <div className="masonry-container">
                {likedProducts.map(product => {
                  const imageUrl = product.images?.[0];
                  if (!imageUrl) return null;
                  
                  return (
                    <div
                      key={product.id}
                      className="masonry-item product-card"
                      onClick={() => router.push(`/products/${product.id}`)}
                    >
                      <img 
                        src={imageUrl} 
                        alt={product.title}
                        className="product-image"
                        style={{ width: '100%', height: 'auto', display: 'block' }}
                      />
                      <div className="product-overlay">
                        <div className="product-overlay-text">{product.title}</div>
                      </div>
                    </div>
                  );
                })}
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

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <EditProfileModal
          profile={profile || { id: user?.id || 0, email: user?.email || '', full_name: user?.full_name || null, username: null, avatar_url: null }}
          onClose={() => setShowEditProfile(false)}
          onSave={async (updates) => {
            // Update profile
            if (token) {
              try {
                console.log('Updating profile with:', updates);
                const res = await fetch('http://localhost:3001/api/profile', {
                  method: 'PATCH',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(updates)
                });
                
                if (res.ok) {
                  const data = await res.json();
                  console.log('Profile updated successfully:', data);
                  // Update local state immediately
                  if (data.profile) {
                    setProfile(data.profile);
                  }
                  await fetchProfile();
                  setShowEditProfile(false);
                } else {
                  const errorText = await res.text();
                  console.error('Error updating profile:', res.status, errorText);
                  let errorMessage = 'Failed to update profile.';
                  try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.error || errorMessage;
                  } catch {
                    errorMessage = errorText || errorMessage;
                  }
                  alert(errorMessage);
                }
              } catch (error) {
                console.error('Error updating profile:', error);
                alert(`Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
              }
            } else {
              alert('Please log in to update your profile');
            }
          }}
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

// Edit Profile Modal Component
interface EditProfileModalProps {
  profile: UserProfile;
  onClose: () => void;
  onSave: (updates: { full_name?: string; username?: string; avatar_url?: string }) => void;
}

function EditProfileModal({ profile, onClose, onSave }: EditProfileModalProps) {
  const [fullName, setFullName] = useState(profile.full_name || '');
  const [username, setUsername] = useState(profile.username || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        full_name: fullName.trim() || undefined,
        username: username.trim() || undefined,
        avatar_url: avatarUrl.trim() || undefined
      });
    } catch (error) {
      console.error('Error in handleSubmit:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <h3 className="text-lg font-bold mb-4">Edit Profile</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Display Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Your name"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Username</label>
            <div className="flex items-center">
              <span className="text-gray-500 mr-1">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                className="flex-1 p-2 border rounded"
                placeholder="username"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Profile Picture URL</label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="https://example.com/image.jpg"
            />
          </div>
          
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-black text-white px-4 py-2 rounded flex-1 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="border px-4 py-2 rounded flex-1 hover:bg-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
