"use client";


import Image from "next/image";
import styles from "./page.module.css";

import { useState } from 'react';

export default function CoutureCloset() {
  const [currentPage, setCurrentPage] = useState('home');

  return (

    <div>

      <nav>
        <button onClick={() => setCurrentPage('home')}>
          Home
        </button>
        <button onClick={() => setCurrentPage('outfit')}>
          Outfit
        </button>
        <button onClick={() => setCurrentPage('closet')}>
          Closet
        </button>
      </nav>

      <main>
        {currentPage === 'home' && <HomePage />}
        {currentPage === 'outfit' && <OutfitPage />}
        {currentPage === 'closet' && <ClosetPage />}
      </main>

    </div>
  );
}

function HomePage() {
  return (

    <div>
      <h1>Home</h1>
      <p>your fyp of outfit ideas</p>
    </div>

  );
}

function OutfitPage() {
  return (

    <div>
      <h1>Outfits</h1>
      <p>induvidual outfit with pieces</p>
    </div>

  );
}

function ClosetPage() {
  return (

    <div>
      <h1>Your Closet</h1>
      <p>here are ur saved outfits</p>
    </div>

  );
}