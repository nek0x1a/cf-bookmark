export type BookmarkData = {
  name: string;
  href: string;
  icon: string;
  description?: string;
};

export type BookmarkGroupData = {
  name: string;
  bookmarks: BookmarkData[];
  emphasized?: boolean;
  description?: string;
};
