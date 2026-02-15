/**
 * 404 Not Found Page
 */

import Link from "next/link";
import { AlertTriangle, Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="inline-block w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="w-10 h-10 text-orange-600" />
        </div>

        <h1 className="text-5xl font-bold text-gray-900 mb-2">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          Page Not Found
        </h2>

        <p className="text-gray-600 mb-6">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been moved or deleted.
        </p>

        <div className="flex gap-3 justify-center mb-8">
          <Link
            href="/"
            className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold"
          >
            <Home className="w-5 h-5" />
            Go Home
          </Link>
          <Link
            href="/shop"
            className="flex items-center gap-2 px-6 py-3 bg-white text-orange-600 border-2 border-orange-500 rounded-lg hover:bg-orange-50 transition-colors font-semibold"
          >
            <Search className="w-5 h-5" />
            Browse Shop
          </Link>
        </div>

        <p className="text-gray-500 text-sm">
          Error Code: 404 | Page Not Found
        </p>
      </div>
    </div>
  );
}
