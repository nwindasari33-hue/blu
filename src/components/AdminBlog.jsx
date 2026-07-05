import React, { useState, useEffect, useRef } from 'react';
import JoditEditor from 'jodit-react';
import * as mammoth from 'mammoth';
import { getBlogs, saveBlog, deleteBlog } from '../services/db';

const AdminBlog = () => {
  const [blogs, setBlogs] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    slug: '',
    coverImage: '',
    content: '',
    metaDescription: '',
    tags: '',
    createdAt: ''
  });
  const [loading, setLoading] = useState(true);
  const editorRef = useRef(null);

  useEffect(() => {
    loadBlogs();
  }, []);

  const loadBlogs = async () => {
    setLoading(true);
    try {
      const data = await getBlogs();
      setBlogs(data || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleCreate = () => {
    setFormData({
      id: Date.now().toString(),
      title: '',
      slug: '',
      coverImage: '',
      content: '',
      metaDescription: '',
      tags: '',
      createdAt: new Date().toISOString()
    });
    setIsEditing(true);
  };

  const handleEdit = (blog) => {
    setFormData({
      ...blog,
      metaDescription: blog.metaDescription || '',
      tags: blog.tags || ''
    });
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Yakin ingin menghapus artikel ini?')) {
      await deleteBlog(id);
      loadBlogs();
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.slug) return alert('Judul dan Slug wajib diisi');
    
    await saveBlog(formData);
    setIsEditing(false);
    loadBlogs();
  };

  const generateSlug = (title) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  };

  const handleTitleChange = (e) => {
    const title = e.target.value;
    setFormData({
      ...formData,
      title,
      slug: generateSlug(title)
    });
  };

  const handleWordImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer }, {
        convertImage: mammoth.images.imgElement(function(image) {
          return image.read("base64").then(function(imageBuffer) {
            return {
              src: "data:" + image.contentType + ";base64," + imageBuffer
            };
          });
        })
      });
      
      setFormData(prev => ({
        ...prev,
        content: prev.content + (prev.content ? '<br/>' : '') + result.value
      }));
      e.target.value = null; // reset input
    } catch (err) {
      console.error(err);
      alert('Gagal mengekstrak file Word. Pastikan formatnya .docx');
    }
  };

  const joditConfig = {
    readonly: false,
    placeholder: 'Mulai menulis artikel...',
    minHeight: 400,
    style: {
      background: '#fff'
    },
    buttons: [
      'source', '|',
      'bold', 'strikethrough', 'underline', 'italic', '|',
      'ul', 'ol', '|',
      'outdent', 'indent', '|',
      'font', 'fontsize', 'brush', 'paragraph', '|',
      'image', 'video', 'table', 'link', '|',
      'align', 'undo', 'redo', '|',
      'hr', 'eraser', 'copyformat', '|',
      'symbol', 'fullsize', 'print'
    ],
    uploader: {
      insertImageAsBase64URI: true
    }
  };

  if (loading) return <div>Memuat Blog...</div>;

  return (
    <div className="admin-blog-container animate-fade-in" style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, color: '#1f2937' }}>Manajemen Blog</h2>
        {!isEditing && (
          <button onClick={handleCreate} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-plus"></i> Tulis Artikel
          </button>
        )}
      </div>

      {!isEditing ? (
        <div className="blog-list" style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {blogs.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280', gridColumn: '1 / -1', background: '#f9fafb', borderRadius: '12px' }}>
              Belum ada artikel. Klik "Tulis Artikel" untuk mulai.
            </div>
          ) : (
            blogs.map(blog => (
              <div key={blog.id} style={{ border: '1px solid #eee', borderRadius: '12px', overflow: 'hidden' }}>
                {blog.coverImage ? (
                  <div style={{ height: '160px', backgroundImage: `url(${blog.coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                ) : (
                  <div style={{ height: '160px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                    <i className="fa-regular fa-image fa-2x"></i>
                  </div>
                )}
                <div style={{ padding: '16px' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}>{blog.title}</h3>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    <button onClick={() => handleEdit(blog)} style={{ flex: 1, padding: '8px', border: '1px solid var(--primary-color)', background: 'transparent', color: 'var(--primary-color)', borderRadius: '6px', cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => handleDelete(blog.id)} style={{ flex: 1, padding: '8px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', borderRadius: '6px', cursor: 'pointer' }}>Hapus</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <form onSubmit={handleSave} className="blog-form">
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Judul Artikel</label>
              <input 
                type="text" 
                value={formData.title} 
                onChange={handleTitleChange} 
                required
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Slug (URL)</label>
              <input 
                type="text" 
                value={formData.slug} 
                onChange={e => setFormData({...formData, slug: e.target.value})} 
                required
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#f9fafb' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Gambar Cover (URL atau Base64)</label>
            <input 
              type="text" 
              value={formData.coverImage} 
              onChange={e => setFormData({...formData, coverImage: e.target.value})} 
              placeholder="https://..."
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Meta Description (SEO)</label>
              <textarea 
                value={formData.metaDescription} 
                onChange={e => setFormData({...formData, metaDescription: e.target.value})} 
                placeholder="Deskripsi singkat untuk Google Search (opsional tapi disarankan)"
                rows="2"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', resize: 'vertical' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Label / Tags</label>
              <input 
                type="text" 
                value={formData.tags} 
                onChange={e => setFormData({...formData, tags: e.target.value})} 
                placeholder="Pisahkan dengan koma (contoh: Tips, Wisuda, 2025)"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h4 style={{ margin: '0 0 4px 0', color: '#166534' }}><i className="fa-solid fa-file-word"></i> Import dari Word (.docx)</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#15803d' }}>Otomatis menyalin teks, gambar, dan format dari file Word.</p>
            </div>
            <div>
              <label className="btn-primary" style={{ cursor: 'pointer', display: 'inline-block', backgroundColor: '#16a34a' }}>
                <i className="fa-solid fa-upload"></i> Pilih File
                <input type="file" accept=".docx" onChange={handleWordImport} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Konten Artikel</label>
            <div style={{ backgroundColor: '#fff', position: 'relative' }}>
              <JoditEditor
                ref={editorRef}
                value={formData.content}
                config={joditConfig}
                tabIndex={1}
                onBlur={newContent => setFormData({...formData, content: newContent})}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button type="button" onClick={() => setIsEditing(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}>
              Batal
            </button>
            <button type="submit" className="btn-primary" style={{ padding: '10px 24px' }}>
              Simpan Artikel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default AdminBlog;
