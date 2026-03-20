import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export type Time = bigint;
export interface HeadingBlock {
    content: Array<RichTextSpan>;
    level: HeadingLevel;
}
export interface WritingPageContent {
    title: string;
    subtitle: string;
}
export interface ImageBlock {
    alt: string;
    url: string;
}
export type Tag = string;
export interface PageContent {
    title: string;
    content: Array<RichText>;
    links: Array<[string, string]>;
    subtitle: string;
}
export interface RichTextBlock {
    content: Array<RichTextSpan>;
}
export interface RichTextListItem {
    content: Array<RichTextSpan>;
}
export interface Essay {
    id: bigint;
    title: string;
    isPublished: boolean;
    publishDate: Time;
    body: Array<RichText>;
    tags: Array<Tag>;
    heroImage?: ExternalBlob;
    subtitle: string;
}
export type PageId = string;
export interface RichTextSpan {
    link?: string;
    text: string;
    isBold: boolean;
    isItalic: boolean;
}
export type RichText = {
    __kind__: "orderedList";
    orderedList: Array<RichTextListItem>;
} | {
    __kind__: "code";
    code: RichTextBlock;
} | {
    __kind__: "unorderedList";
    unorderedList: Array<RichTextListItem>;
} | {
    __kind__: "list";
    list: Array<RichTextListItem>;
} | {
    __kind__: "quote";
    quote: RichTextBlock;
} | {
    __kind__: "heading";
    heading: HeadingBlock;
} | {
    __kind__: "image";
    image: ImageBlock;
} | {
    __kind__: "paragraph";
    paragraph: RichTextBlock;
};
export interface UserProfile {
    name: string;
}
export enum HeadingLevel {
    h1 = "h1",
    h2 = "h2"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createEssay(title: string, subtitle: string, body: Array<RichText>, heroImage: ExternalBlob | null, tagsInput: Array<Tag>, publishDate: Time, isPublished: boolean): Promise<bigint>;
    deleteEssay(id: bigint): Promise<void>;
    filterPublishedEssaysByTag(tag: Tag): Promise<Array<Essay>>;
    getAllEssaysForAdmin(): Promise<Array<Essay>>;
    getAllTags(): Promise<Array<Tag>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getEssayForAdmin(id: bigint): Promise<Essay>;
    getPageContent(pageId: PageId): Promise<PageContent>;
    getPublishedEssay(id: bigint): Promise<Essay>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getWritingPageContent(): Promise<WritingPageContent>;
    initializeAccessControl(): Promise<void>;
    initializeDefaultPages(): Promise<void>;
    isAdmin(): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    listPublishedEssays(): Promise<Array<Essay>>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateEssay(id: bigint, title: string, subtitle: string, body: Array<RichText>, heroImage: ExternalBlob | null, tagsInput: Array<Tag>, publishDate: Time, isPublished: boolean): Promise<void>;
    updatePageContent(pageId: PageId, content: PageContent): Promise<void>;
    updateWritingPageContent(content: WritingPageContent): Promise<void>;
    uploadImage(image: ExternalBlob): Promise<ExternalBlob>;
}
