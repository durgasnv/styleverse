import { useListProducts, useListHubs, useListChallenges } from '@workspace/api-client-react';
import type { Product, StyleHub, Challenge } from '../data/mock-data';

export function useProducts() {
  const { data, isLoading, error } = useListProducts();
  return { products: (data ?? []) as Product[], isLoading, error };
}

export function useHubs() {
  const { data, isLoading, error } = useListHubs();
  return { hubs: (data ?? []) as StyleHub[], isLoading, error };
}

export function useChallenges() {
  const { data, isLoading, error } = useListChallenges();
  return { challenges: (data ?? []) as Challenge[], isLoading, error };
}
