import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import Toast from "~/components/Toast";
import type { BookmarkGroupData } from "~/types/bookmark";
import {
  applyTemporaryIdMap,
  type BookmarkChangeSet,
  type BookmarkSaveActionResult,
  diffBookmarkData,
  isBookmarkChangeSetEmpty,
  isBookmarkDataEqual,
} from "~/utils/bookmarkDiff";

type BookmarkSaveButtonProps = {
  originalData: BookmarkGroupData[];
  bookmarkData: BookmarkGroupData[];
  onSaved: (bookmarkData: BookmarkGroupData[]) => void;
};

type ToastState = {
  message: string;
  variant: "success" | "error" | "info";
};

export default function BookmarkSaveButton({
  originalData,
  bookmarkData,
  onSaved,
}: BookmarkSaveButtonProps) {
  const fetcher = useFetcher<BookmarkSaveActionResult>();

  /*
   * 保存请求发出时的快照。
   *
   * 保存过程中如果用户继续修改 bookmarkData，
   * 用它判断保存完成时是否发生了新的本地修改。
   */
  const submittedDataRef = useRef<BookmarkGroupData[] | null>(null);

  /*
   * fetcher.data 在 revalidation 期间可能会保持不变，
   * 因此不能单纯依赖 effect 重新执行。
   */
  const handledResponseRef = useRef<BookmarkSaveActionResult | null>(null);

  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    const response = fetcher.data;

    if (
      fetcher.state !== "idle" ||
      !response ||
      response === handledResponseRef.current
    ) {
      return;
    }

    handledResponseRef.current = response;

    if (!response.ok) {
      submittedDataRef.current = null;

      setToast({
        message: response.error,
        variant: "error",
      });

      return;
    }

    const submittedData = submittedDataRef.current;

    /*
     * 如果保存过程中本地没有继续修改，
     * 那么直接使用服务器返回的完整数据。
     *
     * 这样可以把：
     *   -1 -> 42
     *
     * 以及其它数据库实际状态一次性同步过来。
     */
    const savedData =
      response.bookmarkData &&
      submittedData &&
      isBookmarkDataEqual(bookmarkData, submittedData)
        ? response.bookmarkData
        : applyTemporaryIdMap(bookmarkData, response.idMap);

    /*
     * 如果用户在保存期间继续修改，
     * 这里只替换已经保存成功的临时 ID，
     * 其它新修改全部保留。
     */
    onSaved(structuredClone(savedData));

    submittedDataRef.current = null;

    setToast({
      message: response.cacheUpdated ? "保存成功" : "保存成功，但缓存更新失败",
      variant: response.cacheUpdated ? "success" : "info",
    });
  }, [bookmarkData, fetcher.data, fetcher.state, onSaved]);

  const handleClick = () => {
    let changes: BookmarkChangeSet | null = null;

    try {
      changes = diffBookmarkData(originalData, bookmarkData);
    } catch (error) {
      console.error("生成书签保存 diff 失败", error);

      setToast({
        message: "无法生成保存数据，请刷新页面后重试",
        variant: "error",
      });

      return;
    }

    if (isBookmarkChangeSetEmpty(changes)) {
      setToast({
        message: "没有需要保存的修改",
        variant: "info",
      });

      return;
    }

    submittedDataRef.current = structuredClone(bookmarkData);

    setToast(null);

    /*
     * 使用当前 route 的 action。
     *
     * encType = application/json
     * 对应 action 中的 request.json()。
     */
    fetcher.submit(
      { changes },
      {
        method: "post",
        encType: "application/json",
      },
    );
  };

  const saving = fetcher.state !== "idle";

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={saving}
        aria-busy={saving}
        className="disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? "[保存中…]" : "[保存数据]"}
      </button>

      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => {
            setToast(null);
          }}
        />
      )}
    </>
  );
}
