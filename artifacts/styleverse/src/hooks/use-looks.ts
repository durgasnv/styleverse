import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createLook, deleteLook, fetchLooks, type Look } from '../lib/looks-api';

function looksQueryKey(userId: string | undefined) {
  return ['looks', userId] as const;
}

export function useLooks(userId: string | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: looksQueryKey(userId),
    queryFn: () => fetchLooks(userId as string),
    enabled: !!userId,
  });

  return { looks: (data ?? []) as Look[], isLoading, error };
}

export function useSaveLook(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { name: string; productIds: string[]; companionScore?: number }) =>
      createLook({ userId: userId as string, ...params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: looksQueryKey(userId) });
    },
  });
}

export function useDeleteLook(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lookId: string) => deleteLook(lookId, userId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: looksQueryKey(userId) });
    },
  });
}
