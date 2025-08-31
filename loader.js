'use client';

// Originally from: https://github.com/jthegedus/firebase-frameworks-nextjs/blob/main/src/app/loader.js
export default function firebaseImageLoader({ src, width, quality }) {
  console.log('firebaseImageLoader',{src,width})
  return `${src}?w=${width}&q=${quality || 75}`;
}
