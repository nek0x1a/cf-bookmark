import type { BookmarkData, BookmarkGroupData } from "./bookmark";

export type EditableBookmarkGroupFields = Pick<
  BookmarkGroupData,
  "name" | "description"
>;

export type EditableBookmarkFields = Pick<
  BookmarkData,
  "name" | "href" | "icon" | "description"
>;

export type BookmarkGroupRecord = Omit<BookmarkGroupData, "bookmarks">;

export type BookmarkInsert = {
  groupId: number;
  bookmark: BookmarkData;
};

export type BookmarkUpdate = BookmarkInsert;

export type BookmarkEditChanges = {
  groups: {
    create: BookmarkGroupRecord[];
    update: BookmarkGroupRecord[];
    delete: number[];
  };
  bookmarks: {
    create: BookmarkInsert[];
    update: BookmarkUpdate[];
    delete: number[];
  };
};

export type DeleteTarget =
  | {
      kind: "group";
      groupId: number;
    }
  | {
      kind: "bookmark";
      groupId: number;
      bookmarkId: number;
    };

export type DragState =
  | {
      kind: "group";
      sourceGroupId: number;
      targetGroupId: number | null;
      position: "before" | "after" | null;
    }
  | {
      kind: "bookmark";
      sourceGroupId: number;
      sourceBookmarkId: number;
      targetGroupId: number | null;
      targetBookmarkId: number | null;
      position: "before" | "after" | "end" | null;
    }
  | null;
