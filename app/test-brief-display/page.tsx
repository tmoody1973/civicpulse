'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface BriefData {
  briefId: string;
  userId: string;
  type: string;
  generatedAt: string;
  duration: number;
  audioUrl: string;
  featureImageUrl: string;
  writtenDigest: string;
  billsCovered: Array<{
    id: string;
    billNumber: string;
    title: string;
    category: string;
    impactScore: number;
  }>;
  newsArticles: Array<{
    title: string;
    topic: string;
    url: string;
  }>;
  policyAreas: string[];
}

export default function TestBriefDisplay() {
  const [brief, setBrief] = useState<BriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/test-brief-display')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setBrief(data.brief);
        } else {
          setError(data.message);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your daily brief...</p>
        </div>
      </div>
    );
  }

  if (error || !brief) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 font-semibold mb-2">Error Loading Brief</h2>
          <p className="text-red-600">{error || 'Brief not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Daily Civic Brief
              </h1>
              <p className="text-gray-600">
                {new Date(brief.generatedAt).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <div className="flex gap-2 mt-3">
                {brief.policyAreas.map(area => (
                  <span
                    key={area}
                    className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Duration</div>
              <div className="text-2xl font-semibold text-gray-900">
                {Math.floor(brief.duration / 60)} min
              </div>
            </div>
          </div>
        </div>

        {/* Feature Image */}
        {brief.featureImageUrl && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
            <img
              src={brief.featureImageUrl}
              alt="Brief feature"
              className="w-full h-64 object-cover"
            />
          </div>
        )}

        {/* Audio Player */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            🎙️ Listen to Your Brief
          </h2>
          <audio
            controls
            className="w-full"
            src={brief.audioUrl}
            preload="metadata"
          >
            Your browser does not support the audio element.
          </audio>
          <p className="text-sm text-gray-500 mt-2">
            Featuring Sarah and James discussing today's most important legislative updates
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-500">Bills Covered</div>
            <div className="text-2xl font-bold text-gray-900">
              {brief.billsCovered.length}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {brief.billsCovered.map(b => b.category).join(', ')}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-500">News Articles</div>
            <div className="text-2xl font-bold text-gray-900">
              {brief.newsArticles.length}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Latest updates
            </div>
          </div>
        </div>

        {/* Bills Covered */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            📋 Bills Covered
          </h2>
          <div className="space-y-4">
            {brief.billsCovered.map(bill => (
              <div
                key={bill.id}
                className="border-l-4 border-blue-500 pl-4 py-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{bill.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{bill.billNumber}</p>
                  </div>
                  <div className="ml-4">
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Impact</div>
                      <div className="text-lg font-bold text-blue-600">
                        {bill.impactScore}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* News Articles */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            📰 Related News
          </h2>
          <div className="space-y-3">
            {brief.newsArticles.map((article, idx) => (
              <a
                key={idx}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
              >
                <div className="flex items-start gap-3">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded uppercase">
                    {article.topic}
                  </span>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 hover:text-blue-600">
                      {article.title}
                    </h3>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-400 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Full Written Digest */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            📄 Full Written Digest
          </h2>
          <div className="prose prose-blue max-w-none">
            <ReactMarkdown>{brief.writtenDigest}</ReactMarkdown>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>Brief ID: {brief.briefId}</p>
          <p className="mt-1">
            Generated at {new Date(brief.generatedAt).toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
}
