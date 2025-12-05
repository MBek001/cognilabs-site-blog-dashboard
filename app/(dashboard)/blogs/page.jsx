"use client"
import { useEffect, useState } from "react";
import { 
  useGetAllBlogsQuery, 
  useCreateBlogMutation, 
  useEditBlogMutation, 
  useDeleteBlogMutation 
} from "../../../redux/api/blogApi";
import Image from "next/image";
import { useRouter } from 'next/navigation'

export default function Page() {
  // Queries
  const { data: blogs, error: getError, isLoading: isLoadingBlogs, isError: isGetError, refetch } = useGetAllBlogsQuery();
  const router = useRouter()
  // Mutations
  const [createBlog, { isLoading: isCreating, isError: isCreateError, error: createError }] = useCreateBlogMutation();
  const [updateBlog, { isLoading: isUpdating, isError: isUpdateError, error: updateError }] = useEditBlogMutation();
  const [deleteBlog, { isLoading: isDeleting, isError: isDeleteError, error: deleteError }] = useDeleteBlogMutation();

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [imagePreview, setImagePreview] = useState(null);
  
  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);
  // Form state
  const [language, setLanguage] = useState(""); // default 'uz'
  const [isActive, setIsActive] = useState(true);
  const [editingId, setEditingId] = useState(null);


  useEffect(() => {
      if (isGetError) {
        // Masalan, backend 401 yoki 403 qaytarsa
        const statusCode = getError?.status || getError?.response?.status
        if (statusCode === 401 || statusCode === 403) {
          router.push('/login') // login sahifasiga redirect
        }
      }
    }, [isGetError, getError, router])

  // Modal functions
  const openCreateModal = () => {
    setModalMode("create");
    setTitle("");
    setContent("");
    setImage(null);
    setImagePreview(null);
    setIsActive(true);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (blog) => {
    setModalMode("edit");
    setTitle(blog.title);
    setContent(blog.content);
    setIsActive(blog.is_active);
    setEditingId(blog.id);
    setImage(null);
    setImagePreview(blog.image);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTitle("");
    setContent("");
    setImage(null);
    setImagePreview(null);
    setIsActive(true);
    setEditingId(null);
  };

  // Handle image preview
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

  // Create blog
  // Create blog
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
  formData.append("language", language);  // <-- qo‘shildi

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


  // Update blog
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

  // Delete blog
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
          <div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-2">
              Manage <span className="text-gray-400">Blogs</span>
            </h1>
          </div>
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

        {/* Blogs Grid */}
        {isLoadingBlogs ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
          </div>
        ) : isGetError ? (
          <div className="text-center py-20">
            <p className="text-red-400 text-lg">{getError?.data?.message || getError?.message}</p>
          </div>
        ) : blogs?.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-xl">No posts yet. Create your first one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogs?.map(blog => (
              <div 
                key={blog.id} 
                className="group bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 hover:border-zinc-700 transition-all duration-300 hover:shadow-2xl hover:shadow-white/5 "
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
                  <p className="text-gray-400 text-xs mb-2">
  {blog.date_posted?.split("T")[0]} <span>{blog.language}</span>
</p>
                  <h3 className="font-bold text-xl text-white  mb-3 line-clamp-2 group-hover:text-gray-300 transition-colors">
                    {blog.title}
                  </h3>
                  <p className="text-gray-400 text-sm mb-6 line-clamp-3 leading-relaxed">
                    {blog.content}
                  </p>
                  
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
       {/* Modal */}
{isModalOpen && (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-zinc-900 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden border border-zinc-800 shadow-2xl">
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
      <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)] space-y-4">
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

        {/* Content */}
        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-300">Content *</label>
          <textarea 
            value={content} 
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full bg-zinc-800 border border-zinc-700 text-white p-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-white/20 text-sm placeholder-gray-500 resize-none"
            placeholder="Write your post content..."
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
    <option value="uz">Uzbek</option>
    <option value="en">English</option>
    <option value="ru">Russian</option>
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
    </div>
  );
}