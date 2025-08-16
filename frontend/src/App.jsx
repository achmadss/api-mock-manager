import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Save, X, Code, Copy, ExternalLink } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

const APIMockManager = () => {
  const [endpoints, setEndpoints] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState(null);
  const [currentEndpoint, setCurrentEndpoint] = useState({
    id: '',
    path: '',
    method: 'GET',
    statusCode: 200,
    body: ''
  });
  const [jsonError, setJsonError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');

  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
  const statusCodes = [200, 201, 204, 400, 401, 403, 404, 409, 422, 500, 502, 503];

  useEffect(() => {
    loadEndpoints();
  }, []);

  const loadEndpoints = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/_manage/endpoints`);
      if (response.ok) {
        const data = await response.json();
        setEndpoints(data);
      } else {
        console.error('Failed to load endpoints');
      }
    } catch (error) {
      console.error('Error loading endpoints:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEndpoints = endpoints.filter(endpoint =>
    endpoint.path.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatJSON = () => {
    try {
      if (currentEndpoint.body != "") {
        const parsed = JSON.parse(currentEndpoint.body);
        const formatted = JSON.stringify(parsed, null, 2);
        setCurrentEndpoint({ ...currentEndpoint, body: formatted });
      }
      setJsonError('');
    } catch (error) {
      setJsonError('Invalid JSON format');
    }
  };

  const validateJSON = (jsonString) => {
    try {
      if (jsonString == "") {
        setJsonError('');
        return true;
      }
      JSON.parse(jsonString);
      setJsonError('');
      return true;
    } catch (error) {
      setJsonError('Invalid JSON format');
      return false;
    }
  };

  const openModal = (endpoint = null) => {
    if (endpoint) {
      setEditingEndpoint(endpoint.id);
      setCurrentEndpoint({ ...endpoint });
    } else {
      setEditingEndpoint(null);
      setCurrentEndpoint({
        id: '',
        path: '',
        method: 'GET',
        statusCode: 200,
        body: ''
      });
    }
    setJsonError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEndpoint(null);
    setJsonError('');
  };

  const saveEndpoint = async () => {
  let path = currentEndpoint.path.trim();

  if (!path) {
    alert('Path is required');
    return;
  }

  if (!path.startsWith('/')) {
    path = '/' + path;
  }

  const duplicate = endpoints.find(
    (ep) =>
      ep.path === path &&
      ep.method === currentEndpoint.method &&
      ep.id !== editingEndpoint // allow updating same endpoint
  );

  if (duplicate) {
    alert(`Endpoint with ${currentEndpoint.method} ${path} already exists`);
    return;
  }

  if (!validateJSON(currentEndpoint.body)) {
    return;
  }

  setLoading(true);
  try {
    const url = editingEndpoint 
      ? `${API_BASE_URL}/api/_manage/endpoints/${editingEndpoint}`
      : `${API_BASE_URL}/api/_manage/endpoints`;

    const method = editingEndpoint ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...currentEndpoint,
        path, // ✅ use validated path
      }),
    });

    if (response.ok) {
      await loadEndpoints();
      closeModal();
    } else {
      const error = await response.json();
      alert(`Error: ${error.error}`);
    }
  } catch (error) {
    console.error('Error saving endpoint:', error);
    alert('Failed to save endpoint');
  } finally {
    setLoading(false);
  }
};


  const deleteEndpoint = async (id) => {
    if (confirm('Are you sure you want to delete this endpoint?')) {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/_manage/endpoints/${id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          await loadEndpoints();
        } else {
          const error = await response.json();
          alert(`Error: ${error.error}`);
        }
      } catch (error) {
        console.error('Error deleting endpoint:', error);
        alert('Failed to delete endpoint');
      } finally {
        setLoading(false);
      }
    }
  };

  const copyEndpointURL = async (endpoint) => {
    const url = `${API_BASE_URL}${endpoint.path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(endpoint.id);
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (error) {
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(endpoint.id);
      setTimeout(() => setCopySuccess(''), 2000);
    }
  };

  const testEndpoint = async (endpoint) => {
    const url = `${API_BASE_URL}${endpoint.path}`;
    window.open(url, '_blank');
  };

  const getStatusCodeColor = (code) => {
    if (code >= 200 && code < 300) return 'text-green-600 bg-green-50';
    if (code >= 300 && code < 400) return 'text-blue-600 bg-blue-50';
    if (code >= 400 && code < 500) return 'text-orange-600 bg-orange-50';
    if (code >= 500) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getMethodColor = (method) => {
    const colors = {
      'GET': 'text-blue-600 bg-blue-50 border-blue-200',
      'POST': 'text-green-600 bg-green-50 border-green-200',
      'PUT': 'text-orange-600 bg-orange-50 border-orange-200',
      'DELETE': 'text-red-600 bg-red-50 border-red-200',
      'PATCH': 'text-purple-600 bg-purple-50 border-purple-200',
      'HEAD': 'text-gray-600 bg-gray-50 border-gray-200',
      'OPTIONS': 'text-indigo-600 bg-indigo-50 border-indigo-200'
    };
    return colors[method] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900">API Mock Manager</h1>
            <button
              onClick={() => openModal()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              New
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search endpoints by path..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading && (
            <div className="p-6 text-center text-gray-500">
              Loading endpoints...
            </div>
          )}
          {!loading && filteredEndpoints.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              {searchTerm ? 'No endpoints found matching your search.' : 'No endpoints created yet. Click "New" to get started.'}
            </div>
          ) : (
            !loading && (
              <div className="divide-y divide-gray-200">
                {filteredEndpoints.map((endpoint) => (
                  <div key={endpoint.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getMethodColor(endpoint.method)}`}>
                            {endpoint.method}
                          </span>
                          <span className={`px-2 py-1 rounded text-sm font-medium ${getStatusCodeColor(endpoint.statusCode)}`}>
                            {endpoint.statusCode}
                          </span>
                          <code className="text-lg font-mono text-gray-900 bg-gray-100 px-3 py-1 rounded">
                            {endpoint.path}
                          </code>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-sm text-gray-600">Mock URL:</span>
                          <code className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded font-mono">
                            {API_BASE_URL}{endpoint.path}
                          </code>
                        </div>
                        <div className="mt-3">
                          <details className="group">
                            <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
                              <Code size={16} />&nbsp;
                              Response Body
                            </summary>
                            <pre className="mt-2 p-3 bg-gray-900 text-green-400 text-sm rounded overflow-x-auto max-h-40 overflow-y-auto">
                              {endpoint.body}
                            </pre>
                          </details>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => testEndpoint(endpoint)}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Test endpoint in new tab"
                        >
                          <ExternalLink size={18} />
                        </button>
                        <button
                          onClick={() => copyEndpointURL(endpoint)}
                          className={`p-2 rounded-lg transition-colors ${copySuccess === endpoint.id ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50'}`}
                          title={copySuccess === endpoint.id ? 'Copied!' : 'Copy endpoint URL'}
                        >
                          <Copy size={18} />
                        </button>
                        <button
                          onClick={() => openModal(endpoint)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit endpoint"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => deleteEndpoint(endpoint.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete endpoint"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingEndpoint ? 'Edit Endpoint' : 'New Endpoint'}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Path (including query params)
                  </label>
                  <input
                    type="text"
                    value={currentEndpoint.path}
                    onChange={(e) => setCurrentEndpoint({ ...currentEndpoint, path: e.target.value })}
                    placeholder="/api/users?limit=10"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Method
                    </label>
                    <select
                      value={currentEndpoint.method}
                      onChange={(e) => setCurrentEndpoint({ ...currentEndpoint, method: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {methods.map(method => (
                        <option key={method} value={method}>{method}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status Code
                    </label>
                    <select
                      value={currentEndpoint.statusCode}
                      onChange={(e) => setCurrentEndpoint({ ...currentEndpoint, statusCode: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {statusCodes.map(code => (
                        <option key={code} value={code}>{code}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Response Body (JSON)
                    </label>
                    <button
                      onClick={formatJSON}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Format JSON
                    </button>
                  </div>
                  <textarea
                    value={currentEndpoint.body}
                    onChange={(e) => {
                      setCurrentEndpoint({ ...currentEndpoint, body: e.target.value });
                      validateJSON(e.target.value);
                    }}
                    rows={12}
                    className={`w-full px-3 py-2 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y ${jsonError ? 'border-red-300' : 'border-gray-300'}`}
                    placeholder=''
                  />
                  {jsonError && (
                    <p className="mt-1 text-sm text-red-600">{jsonError}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEndpoint}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <Save size={18} />
                  {loading ? 'Saving...' : (editingEndpoint ? 'Update' : 'Create')} Endpoint
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default APIMockManager;
