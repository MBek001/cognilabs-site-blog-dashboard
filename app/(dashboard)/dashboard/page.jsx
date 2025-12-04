"use client"

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardSection from '../../../components/dashboard-content'
import { useGetAllBlogsQuery } from '../../../redux/api/blogApi';

export default function Page() {
  const router = useRouter()

  const { data: blogs, error: getError, isLoading: isLoadingBlogs, isError: isGetError, refetch } = useGetAllBlogsQuery()

  // Agar xatolik bo'lsa, login sahifasiga yo'naltirish
  useEffect(() => {
    if (isGetError) {
      // Masalan, backend 401 yoki 403 qaytarsa
      const statusCode = getError?.status || getError?.response?.status
      if (statusCode === 401 || statusCode === 403) {
        router.push('/login') // login sahifasiga redirect
      }
    }
  }, [isGetError, getError, router])

  return (
    <div>
      {isLoadingBlogs ? (
        <p>Loading...</p>
      ) : (
        <DashboardSection blogs={blogs} />
      )}
    </div>
  )
}
