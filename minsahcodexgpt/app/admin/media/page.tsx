'use client';



import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAdminAuth, PERMISSIONS } from '@/contexts/AdminAuthContext';
import { Upload, Image as ImageIcon, Trash2, Copy, Check, RefreshCw, X } from 'lucide-react';
import { adminFetch } from '@/lib/adminFetch';

interface MediaFile {
  name: string;
  size: number;
  lastModified: string;
  url: string;
}

interface MediaStats {
  total: number;
  images: number;
  totalSize: number;
  totalSizeMB: string;
}

export default function MediaLibraryPage() {
  const { requestConfirmation } = useToast();
  const { hasPermission } = useAdminAuth();
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [stats, setStats] = useState<MediaStats>({ total: 0, images: 0, totalSize: 0, totalSizeMB: '0.00' });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [folder, setFolder] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = folder ? `?folder=${encodeURIComponent(folder)}` : '';
      const res = await adminFetch(`/api/media${params}`);
      const data = await res.json();
      if (data.success) {
        setFiles(data.files);
        setStats(data.stats);
      } else {
        setError(data.error || 'Failed to load files');
      }
    } catch {
      setError('Failed to connect to storage');
    } finally {
      setLoading(false);
    }
  }, [folder]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    setError(null);

    for (const file of Array.from(selectedFiles)) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await adminFetch('/api/media', { method: 'POST', body: formData });
        const data = await res.json();
        if (!data.success) {
          setError(data.error || 'Upload failed');
        }
      } catch {
        setError(`Failed to upload ${file.name}`);
      }
    }

    setUploading(false);
    await fetchFiles();
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleDelete(key: string) {
    if (!(await requestConfirmation({ title: 'Delete this file?', description: 'This media file will be removed permanently.', confirmLabel: 'Delete file', tone: 'danger' }))) return;
    try {
      const res = await adminFetch(`/api/media?key=${encodeURIComponent(key)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await fetchFiles();
      } else {
        setError(data.error || 'Delete failed');
      }
    } catch {
      setError('Failed to delete file');
    }
  }

  function handleCopyUrl(url: string) {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function isImage(name: string) {
    return /\.(jpg|jpeg|png|webp|gif)$/i.test(name);
  }

  if (!hasPermission(PERMISSIONS.CONTENT_MANAGE)) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[#8A8F98]">No permission to manage media</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#F7F8F8]">Media Library</h1>
          <p className="text-[#8A8F98] text-sm mt-1">Manage images and files in MinIO storage</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={fetchFiles}
            className="inline-flex items-center px-3 py-2 border border-white/[0.08] bg-[#151516] text-[#F7F8F8] rounded-lg text-sm hover:bg-[#1C1D1F]"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center px-4 py-2 bg-white text-black hover:bg-white/90 rounded-lg disabled:opacity-50"
          >
            <Upload className="w-5 h-5 mr-2" />
            {uploading ? 'Uploading...' : 'Upload Files'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-950/70 border border-red-800/40 text-white/60 rounded-lg flex items-center justify-between">
          <p className="text-white/60 text-sm">{error}</p>
          <Button onClick={() => setError(null)}>
            <X className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#151516] rounded-xl border border-white/[0.08] p-4">
          <p className="text-sm text-[#8A8F98]">Total Files</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-[#151516] rounded-xl border border-white/[0.08] p-4">
          <p className="text-sm text-[#8A8F98]">Images</p>
          <p className="text-2xl font-bold">{stats.images}</p>
        </div>
        <div className="bg-[#151516] rounded-xl border border-white/[0.08] p-4">
          <p className="text-sm text-[#8A8F98]">Storage Used</p>
          <p className="text-2xl font-bold">{stats.totalSizeMB} MB</p>
        </div>
      </div>

      {/* Folder filter */}
      <div className="mb-4 flex gap-2 flex-wrap">
        {['', 'products', 'categories', 'brands', 'avatars', 'banners', 'blog', 'media', 'uploads'].map((f) => (
          <Button
            key={f || 'all'}
            onClick={() => setFolder(f)}
            className={`px-3 py-1 rounded-full text-sm border ${
              folder === f
                ? 'bg-white text-black hover:bg-white/90 border-white'
                : 'bg-white text-[#F7F8F8] border-gray-300 hover:bg-gray-50'
            }`}
          >
            {f || 'All'}
          </Button>
        ))}
      </div>

      {/* File Grid */}
      {loading ? (
        <div className="bg-[#151516] rounded-xl border border-white/[0.08] p-12 text-center text-[#8A8F98]">
          <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-spin" />
          <p className="text-[#8A8F98]">Loading files...</p>
        </div>
      ) : files.length === 0 ? (
        <div className="bg-[#151516] rounded-xl border border-white/[0.08] p-12 text-center text-[#8A8F98]">
          <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#F7F8F8] mb-2">No Files Found</h3>
          <p className="text-[#8A8F98] mb-6">
            {folder ? `No files in "${folder}" folder` : 'Upload your first files to get started'}
          </p>
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-3 bg-white text-black hover:bg-white/90 rounded-lg"
          >
            Upload Files
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {files.map((file) => (
            <div key={file.name} className="bg-[#151516] rounded-xl border border-white/[0.08] overflow-hidden group relative">
              {/* Preview */}
              <div className="aspect-square bg-[#08090A] flex items-center justify-center overflow-hidden">
                {isImage(file.name) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={file.url}
                    alt={file.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                )}
              </div>

              {/* Info */}
              <div className="p-2">
                <p className="text-xs text-[#F7F8F8] truncate" title={file.name.split('/').pop()}>
                  {file.name.split('/').pop()}
                </p>
                <p className="text-xs text-gray-400">{formatSize(file.size)}</p>
              </div>

              {/* Actions overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  onClick={() => handleCopyUrl(file.url)}
                  title="Copy URL"
                  className="p-2 bg-[#151516] border border-white/[0.08] text-[#F7F8F8] rounded-full hover:bg-[#1C1D1F]"
                >
                  {copiedUrl === file.url ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-[#F7F8F8]" />
                  )}
                </Button>
                <Button
                  onClick={() => handleDelete(file.name)}
                  title="Delete"
                  className="p-2 bg-[#151516] border border-white/[0.08] text-[#F7F8F8] rounded-full hover:bg-[#1C1D1F]"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
