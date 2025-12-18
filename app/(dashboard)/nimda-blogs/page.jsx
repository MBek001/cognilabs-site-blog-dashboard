"use client"
import { useEffect, useState, useRef } from "react";
import { 
  useGetAllBlogsQuery, 
  useCreateBlogMutation, 
  useEditBlogMutation, 
  useDeleteBlogMutation 
} from "../../../redux/api/blogApi";
import Image from "next/image";
import { useRouter } from 'next/navigation'

// Import Quill dynamically to avoid SSR issues
let Quill;
if (typeof window !== 'undefined') {
  Quill = require('quill');
}

export default function Page() {
  // Queries
  const { data: blogs, error: getError, isLoading: isLoadingBlogs, isError: isGetError, refetch } = useGetAllBlogsQuery();
  const router = useRouter()
  
  // Mutations
  const [createBlog, { isLoading: isCreating, isError: isCreateError, error: createError }] = useCreateBlogMutation();
  const [updateBlog, { isLoading: isUpdating, isError: isUpdateError, error: updateError }] = useEditBlogMutation();
  const [deleteBlog, { isLoading: isDeleting, isError: isDeleteError, error: deleteError }] = useDeleteBlogMutation();

  // Quill editor ref
  const quillRef = useRef(null);
  const editorRef = useRef(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [imagePreview, setImagePreview] = useState(null);
  
  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);
  const [language, setLanguage] = useState("uz");
  const [isActive, setIsActive] = useState(true);
  const [editingId, setEditingId] = useState(null);

  // Filter state
  const [selectedLanguage, setSelectedLanguage] = useState("all");

  // Filtered blogs
  const filteredBlogs = blogs?.filter(blog => 
    selectedLanguage === "all" || blog.language === selectedLanguage
  );

  useEffect(() => {
    if (isGetError) {
      const statusCode = getError?.status || getError?.response?.status
      if (statusCode === 401 || statusCode === 403) {
        router.push('/login')
      }
    }
  }, [isGetError, getError, router])

  // Initialize Quill editor
  useEffect(() => {
    if (isModalOpen && quillRef.current && !editorRef.current && Quill) {
      // Load Quill CSS only once
      if (!document.querySelector('link[href*="quill.snow.css"]')) {
        const link = document.createElement('link');
        link.href = 'https://cdn.quilljs.com/1.3.6/quill.snow.css';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }

      editorRef.current = new Quill(quillRef.current, {
        theme: 'snow',
        placeholder: 'Write your post content...',
        modules: {
          toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'align': [] }],
            ['link', 'blockquote', 'code-block'],
            ['clean']
          ]
        }
      });

      const editor = editorRef.current;

      // Force LTR globally
      editor.root.setAttribute('dir', 'ltr');
      editor.root.style.direction = 'ltr';
      editor.root.style.textAlign = 'left';

      // Prevent Quill from auto-detecting direction
      editor.root.classList.add('ql-direction-ltr');

      // Clean and set initial content (for edit mode)
      if (content) {
        const cleanedContent = content
          .replace(/\sdir=["']rtl["']/gi, '')
          .replace(/\sdir=["']auto["']/gi, '')
          .replace(/style=["'][^"']*direction:\s*rtl[^"']*["']/gi, '')
          .replace(/style=["'][^"']*text-align:\s*right[^"']*["']/gi, '');

        editor.root.innerHTML = cleanedContent;
      }

      // Listen for changes and enforce LTR + white text
      editor.on('text-change', () => {
        const htmlContent = editor.root.innerHTML;
        setContent(htmlContent);

        // Force LTR on all block elements
        const blocks = editor.root.querySelectorAll('p, div, li, h1, h2, h3, blockquote');
        blocks.forEach(block => {
          block.setAttribute('dir', 'ltr');
          block.style.direction = 'ltr';
          block.style.textAlign = 'left';
        });
      });
    }

    // Cleanup when modal closes
    return () => {
      if (!isModalOpen && editorRef.current) {
        editorRef.current = null;
      }
    };
  }, [isModalOpen, content]);

  // Modal functions
  const openCreateModal = () => {
    setModalMode("create");
    setTitle("");
    setContent("");
    setImage(null);
    setImagePreview(null);
    setLanguage("uz");
    setIsActive(true);
    setEditingId(null);
    setIsModalOpen(true);
    editorRef.current = null;
  };

  const openEditModal = (blog) => {
    setModalMode("edit");
    setTitle(blog.title);
    setContent(blog.content);
    setLanguage(blog.language || "uz");
    setIsActive(blog.is_active);
    setEditingId(blog.id);
    setImage(null);
    setImagePreview(blog.image_url);
    setIsModalOpen(true);
    editorRef.current = null;
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTitle("");
    setContent("");
    setImage(null);
    setImagePreview(null);
    setLanguage("uz");
    setIsActive(true);
    setEditingId(null);
    editorRef.current = null;
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = async () => {
    if (!title || !content || !image) {
      alert("Iltimos, barcha maydonlarni to'ldiring va rasm tanlang!");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("content", content);
    formData.append("image", image);
    formData.append("is_active", isActive);
    formData.append("language", language);

    try {
      await createBlog(formData).unwrap();
      alert("Blog muvaffaqiyatli qo'shildi!");
      closeModal();
      refetch();
    } catch (err) {
      console.error("Create error:", err);
      alert(`Xato yuz berdi: ${err?.data?.message || err.message}`);
    }
  };

  const handleUpdate = async () => {
    if (!title || !content) {
      alert("Iltimos, title va content maydonlarini to'ldiring!");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("content", content);
    formData.append("language", language); 
    formData.append("is_active", isActive);
    if (image) formData.append("image", image);

    try {
      await updateBlog({ id: editingId, data: formData }).unwrap();
      alert("Blog muvaffaqiyatli yangilandi!");
      closeModal();
      refetch();
    } catch (err) {
      console.error("Update error:", err);
      alert(`Xato yuz berdi: ${err?.data?.message || err.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Rostan ham o'chirmoqchimisiz?")) return;
    try {
      await deleteBlog(id).unwrap();
      alert("Blog o'chirildi!");
      refetch();
    } catch (err) {
      console.error("Delete error:", err);
      alert("Blogni o'chirishda xato yuz berdi!");
    }
  };

  return (
    <div className="min-h-screen bg-white text-black p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">
              Manage Your <span className="text-gray-400">Blogs</span>
            </h1>
          </div>
          <div>
            <button 
              onClick={openCreateModal}
              className="group cursor-pointer relative px-8 py-3 bg-white text-black font-semibold rounded-full hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <span className="flex items-center gap-2">
                <span className="text-2xl">+</span>
                <span>Create Post</span>
              </span>
            </button>
          </div>
        </div>

        {/* Language Filter */}
        <div className="mb-8 flex items-center gap-3">
          <span className="text-gray-600 font-medium">Filter by language:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedLanguage("all")}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                selectedLanguage === "all" 
                  ? "bg-black text-white shadow-md" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedLanguage("uz")}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                selectedLanguage === "uz" 
                  ? "bg-black text-white shadow-md" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              🇺🇿 Uzbek
            </button>
            <button
              onClick={() => setSelectedLanguage("en")}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                selectedLanguage === "en" 
                  ? "bg-black text-white shadow-md" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              🇬🇧 English
            </button>
            <button
              onClick={() => setSelectedLanguage("ru")}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                selectedLanguage === "ru" 
                  ? "bg-black text-white shadow-md" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              🇷🇺 Russian
            </button>
          </div>
        </div>

        {/* Blogs Grid */}
        {isLoadingBlogs ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-black"></div>
          </div>
        ) : isGetError ? (
          <div className="text-center py-20">
            <p className="text-red-400 text-lg">{getError?.data?.message || getError?.message}</p>
          </div>
        ) : filteredBlogs?.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-xl">
              {selectedLanguage === "all" 
                ? "No posts yet. Create your first one!" 
                : `No posts in ${selectedLanguage === "uz" ? "Uzbek" : selectedLanguage === "en" ? "English" : "Russian"}`
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBlogs?.map(blog => (
              <div 
                key={blog.id} 
                className="group bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 hover:border-zinc-700 transition-all duration-300 hover:shadow-2xl hover:shadow-white/5"
              >
                {/* Image Container */}
                <div className="relative h-56 bg-zinc-800 overflow-hidden">
                  {blog.image_url ? (
                    <Image
                      src={`${process.env.NEXT_PUBLIC_BASE_URL}/uploads/${blog.image_url}`}
                      width={600}
                      height={400}  
                      alt={blog.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-20 h-20 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  {/* Status Badge */}
                  <div className="absolute top-4 right-4">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full backdrop-blur-sm ${blog.is_active ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                      {blog.is_active ? '● Active' : '○ Inactive'}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-400 text-xs">
                      {blog.date_posted?.split("T")[0]}
                    </p>
                    <span className="px-2 py-1 bg-zinc-800 text-gray-300 text-xs rounded-md font-medium">
                      {blog.language === "uz" ? "🇺🇿 UZ" : blog.language === "en" ? "🇬🇧 EN" : "🇷🇺 RU"}
                    </span>
                  </div>
                  <h3 className="font-bold text-xl text-white mb-3 line-clamp-2 group-hover:text-gray-300 transition-colors">
                    {blog.title}
                  </h3>
                  <div 
                    className="text-gray-400 text-sm mb-6 line-clamp-3 leading-relaxed prose prose-invert prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: blog.content }}
                  />
                  
                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <button 
                      onClick={() => openEditModal(blog)} 
                      disabled={isUpdating}
                      className="flex-1 px-4 cursor-pointer py-2.5 bg-white text-black text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(blog.id)} 
                      disabled={isDeleting} 
                      className="flex-1 px-4 py-2.5 cursor-pointer bg-zinc-800 text-white text-sm font-semibold rounded-lg hover:bg-red-600 hover:text-white transition-colors duration-200 border border-zinc-700 hover:border-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden border border-zinc-800 shadow-2xl">
              {/* Modal Header */}
              <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                <h2 className="text-2xl text-white font-bold">
                  {modalMode === "create" ? "Create New Post" : "Edit Post"}
                </h2>
                <button 
                  onClick={closeModal}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-800 transition-colors text-gray-400 hover:text-white"
                >
                  <svg className="w-5 h-5 text-white cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(85vh-180px)] space-y-4">
                {(isCreateError || isUpdateError) && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">
                    {createError?.data?.message || updateError?.data?.message || "An error occurred"}
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-300">Title *</label>
                  <input 
                    type="text" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    className="w-full bg-zinc-800 border border-zinc-700 text-white p-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-white/20 text-sm placeholder-gray-500"
                    placeholder="Enter post title"
                  />
                </div>

                {/* Content with Quill */}
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-300">Content *</label>
                  <div 
                    ref={quillRef}
                    dir="ltr"
                    className="bg-zinc-800 border border-zinc-700 rounded-lg quill-editor"
                    style={{ minHeight: '200px' }}
                  />
                </div>

                {/* Language */}
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-300">
                    Language *
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white p-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-white/20 text-sm"
                  >
                    <option value="uz">🇺🇿 Uzbek</option>
                    <option value="en">🇬🇧 English</option>
                    <option value="ru">🇷🇺 Russian</option>
                  </select>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-300">
                    {modalMode === "create" ? "Image *" : "New Image (optional)"}
                  </label>
                  <input 
                    type="file" 
                    onChange={handleImageChange} 
                    accept="image/*"
                    className="hidden"
                    id="image-upload"
                  />
                  <label 
                    htmlFor="image-upload"
                    className="block w-full p-3 bg-zinc-800 border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer hover:border-zinc-600 text-center text-gray-400 text-sm"
                  >
                    {image ? image.name : "Click to upload image"}
                  </label>
                  {imagePreview && (
                    <div className="mt-2">
                      <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
                    </div>
                  )}
                </div>

                {/* Active Toggle */}
                <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                  <label htmlFor="is_active" className="text-sm font-semibold text-gray-300">Is Active</label>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${isActive ? 'bg-white' : 'bg-zinc-700'}`}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-black transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-zinc-800 flex gap-3">
                <button 
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 bg-zinc-800 text-white font-semibold rounded-lg hover:bg-zinc-700 transition-colors border border-zinc-700 text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={modalMode === "create" ? handleCreate : handleUpdate} 
                  disabled={isCreating || isUpdating} 
                  className="flex-1 px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {modalMode === "create" 
                    ? (isCreating ? "Creating..." : "Create Post") 
                    : (isUpdating ? "Saving..." : "Save Changes")
                  }
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .quill-editor .ql-container {
          background: #27272a;
          border: none !important;
          border-bottom-left-radius: 8px;
          border-bottom-right-radius: 8px;
        }

        .quill-editor .ql-editor {
          color: white !important;
          direction: ltr !important;
          text-align: left !important;
          unicode-bidi: plaintext !important;
          min-height: 200px;
        }

        /* Force all text inside editor to be white */
        .quill-editor .ql-editor *,
        .quill-editor .ql-editor p,
        .quill-editor .ql-editor span,
        .quill-editor .ql-editor div,
        .quill-editor .ql-editor li,
        .quill-editor .ql-editor h1,
        .quill-editor .ql-editor h2,
        .quill-editor .ql-editor h3,
        .quill-editor .ql-editor blockquote {
          color: white !important;
          direction: ltr !important;
          text-align: left !important;
        }

        .quill-editor .ql-toolbar {
          background: #27272a;
          border: none !important;
          border-bottom: 1px solid #3f3f46 !important;
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
        }

        .quill-editor .ql-toolbar button {
          color: #a1a1aa;
        }

        .quill-editor .ql-toolbar button:hover,
        .quill-editor .ql-toolbar button.ql-active {
          color: white !important;
          background: #3f3f46;
        }

        .quill-editor .ql-stroke {
          stroke: #a1a1aa;
        }

        .quill-editor .ql-toolbar button:hover .ql-stroke,
        .quill-editor .ql-toolbar button.ql-active .ql-stroke {
          stroke: white;
        }

        .quill-editor .ql-fill {
          fill: #a1a1aa;
        }

        .quill-editor .ql-toolbar button:hover .ql-fill,
        .quill-editor .ql-toolbar button.ql-active .ql-fill {
          fill: white;
        }

        .quill-editor .ql-editor.ql-blank::before {
          color: #71717a !important;
          font-style: italic;
        }

        .quill-editor .ql-picker-label,
        .quill-editor .ql-picker-options {
          color: #a1a1aa;
        }

        .quill-editor .ql-picker-options {
          background: #27272a;
          border: 1px solid #3f3f46;
        }

        .quill-editor .ql-picker-item:hover {
          color: white;
          background: #3f3f46;
        }
      `}</style>
    </div>
  );
}