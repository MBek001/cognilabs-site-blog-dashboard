import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const blogApi = createApi({
  reducerPath: "blogApi",
  baseQuery: fetchBaseQuery({
     baseUrl: process.env.NEXT_PUBLIC_BASE_URL ,
     prepareHeaders: (headers) => {
      const token = localStorage.getItem("token");
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
     }
    }),


  endpoints: (builder) => ({

    createBlog: builder.mutation({
      query: (newPost) => ({
        url: "/admin/create/blog/",
        method: "POST",
        body: newPost,
      }),
    }),

    getAllBlogs: builder.query({
      query: () => "/admin/all-blogs/",
    }),

    getBlogById: builder.query({
      query: (id) => `/admin/get-blog/${id}/`,
    }),

    // blogApi.js da
editBlog: builder.mutation({
  query: ({ id, data }) => ({
    url: `/admin/edit-blog/${id}/`,
    method: "PATCH",
    body: data, // FormData
  }),
}),

    deleteBlog: builder.mutation({
      query: (id) => ({
        url: `/admin/delete-blog/${id}/`,
        method: "DELETE",
      }),
    }), 
  }),
});

export const { useGetAllBlogsQuery, useGetBlogByIdQuery, useCreateBlogMutation, useEditBlogMutation, useDeleteBlogMutation } = blogApi;
