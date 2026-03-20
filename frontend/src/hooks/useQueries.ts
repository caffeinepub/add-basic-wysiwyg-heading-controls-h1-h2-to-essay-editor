import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import type { PageContent, Essay, Tag, UserProfile, RichText, ExternalBlob, Time, WritingPageContent } from '../backend';

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

export function useIsAdmin() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<boolean>({
    queryKey: ['isAdmin', identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isAdmin();
    },
    enabled: !!actor && !actorFetching && !!identity,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
}

export function useGetPageContent(pageId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<PageContent>({
    queryKey: ['pageContent', pageId],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getPageContent(pageId);
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useUpdatePageContent() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pageId, content }: { pageId: string; content: PageContent }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updatePageContent(pageId, content);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pageContent', variables.pageId] });
    },
  });
}

export function useGetWritingPageContent() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<WritingPageContent>({
    queryKey: ['writingPageContent'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getWritingPageContent();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useUpdateWritingPageContent() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: WritingPageContent) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateWritingPageContent(content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['writingPageContent'] });
    },
  });
}

export function useListPublishedEssays() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Essay[]>({
    queryKey: ['publishedEssays'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listPublishedEssays();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useGetPublishedEssay(id: bigint | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Essay>({
    queryKey: ['publishedEssay', id?.toString()],
    queryFn: async () => {
      if (!actor || !id) throw new Error('Actor or ID not available');
      return actor.getPublishedEssay(id);
    },
    enabled: !!actor && !actorFetching && id !== null,
  });
}

export function useFilterPublishedEssaysByTag(tag: string | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Essay[]>({
    queryKey: ['publishedEssays', 'tag', tag],
    queryFn: async () => {
      if (!actor || !tag) throw new Error('Actor or tag not available');
      return actor.filterPublishedEssaysByTag(tag);
    },
    enabled: !!actor && !actorFetching && !!tag,
  });
}

export function useGetAllTags() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getAllTags();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useGetAllEssaysForAdmin() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Essay[]>({
    queryKey: ['allEssaysAdmin'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getAllEssaysForAdmin();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useGetEssayForAdmin(id: bigint | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Essay>({
    queryKey: ['essayAdmin', id?.toString()],
    queryFn: async () => {
      if (!actor || !id) throw new Error('Actor or ID not available');
      return actor.getEssayForAdmin(id);
    },
    enabled: !!actor && !actorFetching && id !== null,
  });
}

export function useCreateEssay() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      title,
      subtitle,
      body,
      heroImage,
      tags,
      publishDate,
      isPublished,
    }: {
      title: string;
      subtitle: string;
      body: RichText[];
      heroImage: ExternalBlob | null;
      tags: Tag[];
      publishDate: Time;
      isPublished: boolean;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createEssay(title, subtitle, body, heroImage, tags, publishDate, isPublished);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allEssaysAdmin'] });
      queryClient.invalidateQueries({ queryKey: ['publishedEssays'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

export function useUpdateEssay() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      title,
      subtitle,
      body,
      heroImage,
      tags,
      publishDate,
      isPublished,
    }: {
      id: bigint;
      title: string;
      subtitle: string;
      body: RichText[];
      heroImage: ExternalBlob | null;
      tags: Tag[];
      publishDate: Time;
      isPublished: boolean;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateEssay(id, title, subtitle, body, heroImage, tags, publishDate, isPublished);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['allEssaysAdmin'] });
      queryClient.invalidateQueries({ queryKey: ['publishedEssays'] });
      queryClient.invalidateQueries({ queryKey: ['essayAdmin', variables.id.toString()] });
      queryClient.invalidateQueries({ queryKey: ['publishedEssay', variables.id.toString()] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

export function useDeleteEssay() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteEssay(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allEssaysAdmin'] });
      queryClient.invalidateQueries({ queryKey: ['publishedEssays'] });
    },
  });
}

export function useInitializeDefaultPages() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.initializeDefaultPages();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pageContent'] });
      queryClient.invalidateQueries({ queryKey: ['writingPageContent'] });
    },
  });
}
