import { apiRequestData } from '@/api/client'
import type { UserRole } from '@shared/types/user'
import type {
  AdminArticle,
  AdminComment,
  AdminUser,
} from '@/types/admin'

export function getAdminArticles() {
  return apiRequestData<AdminArticle[]>('/admin/articles', {
    fallbackMessage: 'Failed to load admin articles',
  })
}

export function getAdminComments() {
  return apiRequestData<AdminComment[]>('/admin/comments', {
    fallbackMessage: 'Failed to load admin comments',
  })
}

export function getAdminUsers() {
  return apiRequestData<AdminUser[]>('/admin/users', {
    fallbackMessage: 'Failed to load admin users',
  })
}

export function restoreAdminArticle(id: string) {
  return apiRequestData<AdminArticle>(
    `/admin/articles/${id}/restore`,
    {
      method: 'PATCH',
      fallbackMessage: 'Failed to restore article',
    },
  )
}

export function restoreAdminComment(id: string) {
  return apiRequestData<AdminComment>(
    `/admin/comments/${id}/restore`,
    {
      method: 'PATCH',
      fallbackMessage: 'Failed to restore comment',
    },
  )
}

export function updateAdminUserRole(
  id: string,
  role: UserRole,
) {
  return apiRequestData<AdminUser>(
    `/admin/users/${id}/role`,
    {
      method: 'PATCH',
      body: { role },
      fallbackMessage: 'Failed to update user role',
    },
  )
}