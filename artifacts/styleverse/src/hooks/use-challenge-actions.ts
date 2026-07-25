import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getListChallengesQueryKey } from '@workspace/api-client-react';
import { submitChallengeEntry, voteChallengeEntry } from '../lib/challenges-api';

export function useSubmitChallengeEntry(challengeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { productIds: string[]; creatorName: string; creatorId: string }) =>
      submitChallengeEntry(challengeId, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListChallengesQueryKey() });
    },
  });
}

export function useVoteChallengeEntry(challengeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, voterId }: { entryId: string; voterId: string }) =>
      voteChallengeEntry(challengeId, entryId, voterId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListChallengesQueryKey() });
    },
  });
}
