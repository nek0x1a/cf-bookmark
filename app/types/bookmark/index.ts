export type BookmarkData = {
  id: number;
  sort: number;
  name: string;
  href: string;
  icon: string;
  description: string;
};

export type BookmarkGroupData = {
  id: number;
  sort: number;
  name: string;
  bookmarks: BookmarkData[];
  emphasized: boolean;
  description: string;
};
