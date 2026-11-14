import React from 'react';
import AppGuideChat from '../components/help/AppGuideChat';

export default function Help() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Help & Guidance</h1>
        <p className="text-gray-600 mt-1">Get help with using the app</p>
      </div>

      <div className="max-w-4xl mx-auto">
        <AppGuideChat />
      </div>
    </div>
  );
}