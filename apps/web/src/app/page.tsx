"use client";


import Image from "next/image";
import styles from "./page.module.css";

import { useState } from 'react';

export default function CoutureCloset() {const [currentPage, setCurrentPage] = useState('home');

  return (

    <div className="min-h-screen bg-gray-50">

      <nav className="bg-white border-b p-4">

        <div className="flex justify-between items-center max-w-6xl mx-auto">

          <h1 className="text-2xl font-bold">Couture Closet</h1>
          
          <div className="flex gap-3">
            
            <button onClick={() => setCurrentPage('home')} className={currentPage === 'home' ? 'bg-purple-600 text-white px-6 py-2 rounded' : 'bg-gray-100 px-6 py-2 rounded'}>Home</button>
            
            <button onClick={() => setCurrentPage('profile')} className={currentPage === 'profile' ? 'bg-purple-600 text-white px-6 py-2 rounded' : 'bg-gray-100 px-6 py-2 rounded'}>Profile</button>
            
          
          </div>

        </div>

      </nav>

      <main className="max-w-6xl mx-auto p-8">{currentPage === 'home' && <HomePage />} {currentPage === 'outfit' && <ProfilePage />}</main>

    </div>
  );
}

function HomePage() {
  return (
    <div>

      <div className="mb-8">

        <h1 className="text-4xl font-bold mb-2">Home</h1>
        <p className="text-xl text-gray-600">your fyp of outfit ideas</p>

      </div>
      
      <div className="bg-white p-8 rounded">
        <p className="text-gray-500">fyp</p>
      </div>

    </div>
  );
}

function ProfilePage() {
  return (
    <div>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Outfits</h1>
        <p className="text-xl text-gray-600">induvidual outfit with pieces</p>
      
      </div>
      
      <div className="bg-white p-8 rounded">
        <p className="text-gray-500">closet</p>
      </div>

    </div>
  );
}

