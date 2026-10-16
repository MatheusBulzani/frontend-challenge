import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { api, readApiError } from './client.ts'
import { authStorage, useAuthToken } from '../auth/storage.ts'
import { pushNotice } from '../ui/notices.ts'

export function useFavorites() {
  const token = useAuthToken()
  return useQuery({
    queryKey: ['favorites', token],
    queryFn: ({ signal }) => api.favorites(signal) as Promise<{ nftIds: string[] }>,
    enabled: Boolean(token),
  })
}

export function useFavoriteToggle() {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: async ({ nftId, active }: { nftId: string; active: boolean }) => {
      if (!authStorage.getToken()) {
        void navigate({ to: '/login', search: { redirect: window.location.pathname } })
        return null
      }
      return active ? api.removeFavorite(nftId) : api.addFavorite(nftId)
    },
    onMutate: async ({ nftId, active }) => {
      if (!token) return { previous: undefined }
      await queryClient.cancelQueries({ queryKey: ['favorites', token] })
      const previous = queryClient.getQueryData<{ nftIds: string[] }>(['favorites', token])
      const ids = new Set(previous?.nftIds ?? [])
      if (active) ids.delete(nftId)
      else ids.add(nftId)
      queryClient.setQueryData(['favorites', token], { nftIds: [...ids] })
      return { previous }
    },
    onError: (error, _variables, context) => {
      if (token) queryClient.setQueryData(['favorites', token], context?.previous)
      pushNotice(readApiError(error).message)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['favorites'] })
    },
  })
}
