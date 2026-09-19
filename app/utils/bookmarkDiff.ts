import type { BookmarkData, BookmarkGroupData } from "~/types/bookmark";

type BookmarkGroupUpdateChanges = Partial<
  Pick<BookmarkGroupData, "sort" | "name" | "description" | "emphasized">
>;

type BookmarkCreate = BookmarkData & {
  groupId: BookmarkGroupData["id"];
};

type BookmarkUpdateChanges = Partial<
  Pick<BookmarkData, "sort" | "name" | "href" | "icon" | "description">
> & {
  groupId?: BookmarkGroupData["id"];
};

type BookmarkGroupCreate = Omit<BookmarkGroupData, "bookmarks"> & {
  bookmarks: BookmarkData[];
};

export type BookmarkChangeSet = {
  groups: {
    create: BookmarkGroupCreate[];
    update: Array<{
      id: BookmarkGroupData["id"];
      changes: BookmarkGroupUpdateChanges;
    }>;
    delete: BookmarkGroupData["id"][];
  };

  bookmarks: {
    create: BookmarkCreate[];
    update: Array<{
      id: BookmarkData["id"];
      changes: BookmarkUpdateChanges;
    }>;
    delete: BookmarkData["id"][];
  };
};

export type BookmarkIdMap = {
  groups: Array<[temporaryId: number, databaseId: number]>;
  bookmarks: Array<[temporaryId: number, databaseId: number]>;
};

export type BookmarkSaveActionResult =
  | {
      ok: true;
      bookmarkData: BookmarkGroupData[] | null;
      idMap: BookmarkIdMap;
      cacheUpdated: boolean;
    }
  | {
      ok: false;
      error: string;
    };

function getNextTemporaryId(ids: number[]) {
  return Math.min(0, ...ids) - 1;
}

function getBookmarkChanges(
  original: BookmarkData,
  current: BookmarkData,
  originalGroupId: BookmarkGroupData["id"],
  currentGroupId: BookmarkGroupData["id"],
): BookmarkUpdateChanges {
  const changes: BookmarkUpdateChanges = {};

  if (originalGroupId !== currentGroupId) {
    changes.groupId = currentGroupId;
  }

  if (original.sort !== current.sort) {
    changes.sort = current.sort;
  }

  if (original.name !== current.name) {
    changes.name = current.name;
  }

  if (original.href !== current.href) {
    changes.href = current.href;
  }

  if (original.icon !== current.icon) {
    changes.icon = current.icon;
  }

  if (original.description !== current.description) {
    changes.description = current.description;
  }

  return changes;
}

function hasChanges(value: object) {
  return Object.keys(value).length > 0;
}

export function diffBookmarkData(
  originalData: BookmarkGroupData[],
  currentData: BookmarkGroupData[],
): BookmarkChangeSet {
  const originalGroups = new Map(
    originalData.map((group) => [group.id, group] as const),
  );

  const originalBookmarks = new Map<
    BookmarkData["id"],
    {
      bookmark: BookmarkData;
      groupId: BookmarkGroupData["id"];
    }
  >();

  for (const group of originalData) {
    for (const bookmark of group.bookmarks) {
      originalBookmarks.set(bookmark.id, {
        bookmark,
        groupId: group.id,
      });
    }
  }

  const changes: BookmarkChangeSet = {
    groups: {
      create: [],
      update: [],
      delete: [],
    },
    bookmarks: {
      create: [],
      update: [],
      delete: [],
    },
  };

  const currentGroupIds = new Set<number>();
  const currentBookmarkIds = new Set<number>();

  for (const group of currentData) {
    currentGroupIds.add(group.id);

    if (group.id < 0) {
      /*
       * 新书签组本身属于 create。
       *
       * 其中：
       * - 负数 ID 的书签也是新建，随 group 一起创建。
       * - 正数 ID 的书签代表原有书签移动到新组，
       *   仍然走 bookmark update。
       */
      changes.groups.create.push({
        ...group,
        bookmarks: group.bookmarks.filter((bookmark) => bookmark.id < 0),
      });
    } else {
      const originalGroup = originalGroups.get(group.id);

      if (!originalGroup) {
        throw new Error(`找不到书签组 ${group.id} 的原始数据`);
      }

      const groupChanges: BookmarkGroupUpdateChanges = {};

      if (originalGroup.sort !== group.sort) {
        groupChanges.sort = group.sort;
      }

      if (originalGroup.name !== group.name) {
        groupChanges.name = group.name;
      }

      if (originalGroup.description !== group.description) {
        groupChanges.description = group.description;
      }

      if (originalGroup.emphasized !== group.emphasized) {
        groupChanges.emphasized = group.emphasized;
      }

      if (hasChanges(groupChanges)) {
        changes.groups.update.push({
          id: group.id,
          changes: groupChanges,
        });
      }
    }

    for (const bookmark of group.bookmarks) {
      currentBookmarkIds.add(bookmark.id);

      if (bookmark.id < 0) {
        /*
         * 新组中的新书签会随新组一起创建。
         */
        if (group.id < 0) {
          continue;
        }

        /*
         * 已有组中的新书签独立 INSERT。
         */
        changes.bookmarks.create.push({
          ...bookmark,
          groupId: group.id,
        });

        continue;
      }

      const originalBookmark = originalBookmarks.get(bookmark.id);

      if (!originalBookmark) {
        throw new Error(`找不到书签 ${bookmark.id} 的原始数据`);
      }

      const bookmarkChanges = getBookmarkChanges(
        originalBookmark.bookmark,
        bookmark,
        originalBookmark.groupId,
        group.id,
      );

      if (hasChanges(bookmarkChanges)) {
        changes.bookmarks.update.push({
          id: bookmark.id,
          changes: bookmarkChanges,
        });
      }
    }
  }

  for (const group of originalData) {
    if (!currentGroupIds.has(group.id)) {
      changes.groups.delete.push(group.id);
    }
  }

  for (const bookmark of originalBookmarks.values()) {
    if (!currentBookmarkIds.has(bookmark.bookmark.id)) {
      changes.bookmarks.delete.push(bookmark.bookmark.id);
    }
  }

  return changes;
}

export function isBookmarkChangeSetEmpty(changes: BookmarkChangeSet) {
  return (
    changes.groups.create.length === 0 &&
    changes.groups.update.length === 0 &&
    changes.groups.delete.length === 0 &&
    changes.bookmarks.create.length === 0 &&
    changes.bookmarks.update.length === 0 &&
    changes.bookmarks.delete.length === 0
  );
}

export function isBookmarkDataEqual(
  left: BookmarkGroupData[],
  right: BookmarkGroupData[],
) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function applyTemporaryIdMap(
  bookmarkData: BookmarkGroupData[],
  idMap: BookmarkIdMap,
) {
  const groupIdMap = new Map(idMap.groups);
  const bookmarkIdMap = new Map(idMap.bookmarks);

  return bookmarkData.map((group) => ({
    ...group,
    id: groupIdMap.get(group.id) ?? group.id,
    bookmarks: group.bookmarks.map((bookmark) => ({
      ...bookmark,
      id: bookmarkIdMap.get(bookmark.id) ?? bookmark.id,
    })),
  }));
}

export function createTemporaryGroupId(
  bookmarkData: BookmarkGroupData[],
): number {
  return getNextTemporaryId(bookmarkData.map((group) => group.id));
}

export function createTemporaryBookmarkId(
  bookmarkData: BookmarkGroupData[],
): number {
  return getNextTemporaryId(
    bookmarkData.flatMap((group) =>
      group.bookmarks.map((bookmark) => bookmark.id),
    ),
  );
}
