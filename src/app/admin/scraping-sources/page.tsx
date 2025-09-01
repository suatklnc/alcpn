'use client';

import { useEffect, useState } from 'react';
import { ScrapingSource } from '@/types/admin';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import ScrapingSourceModal from '@/components/admin/ScrapingSourceModal';

export default function ScrapingSourcesPage() {
  const [sources, setSources] = useState<ScrapingSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingSource, setEditingSource] = useState<ScrapingSource | null>(null);

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/scraping-sources');
      
      if (!response.ok) {
        throw new Error('Failed to fetch scraping sources');
      }
      
      const data = await response.json();
      setSources(data.sources);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingSource(null);
    setShowModal(true);
  };

  const handleEdit = (source: ScrapingSource) => {
    setEditingSource(source);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scraping source?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/scraping-sources/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete scraping source');
      }

      await fetchSources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleToggleActive = async (source: ScrapingSource) => {
    try {
      const response = await fetch(`/api/admin/scraping-sources/${source.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: !source.is_active,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update scraping source');
      }

      await fetchSources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingSource(null);
    fetchSources();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scraping Sources</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage scraping sources and their selectors
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Source
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Sources Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {sources.map((source) => (
            <li key={source.id}>
              <div className="px-4 py-4 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`h-2 w-2 rounded-full ${
                      source.is_active ? 'bg-green-400' : 'bg-gray-400'
                    }`} />
                  </div>
                  <div className="ml-4">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-gray-900">
                        {source.name}
                      </p>
                      {!source.is_active && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{source.base_url}</p>
                    <p className="text-xs text-gray-400">
                      Price selector: {source.selectors.price}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleToggleActive(source)}
                    className="text-gray-400 hover:text-gray-600"
                    title={source.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {source.is_active ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(source)}
                    className="text-blue-400 hover:text-blue-600"
                    title="Edit"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(source.id)}
                    className="text-red-400 hover:text-red-600"
                    title="Delete"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Empty State */}
      {sources.length === 0 && (
        <div className="text-center py-12">
          <CogIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No scraping sources</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new scraping source.
          </p>
          <div className="mt-6">
            <button
              onClick={handleCreate}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Source
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ScrapingSourceModal
          source={editingSource}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
