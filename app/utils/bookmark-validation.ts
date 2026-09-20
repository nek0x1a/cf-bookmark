export function validateName(value: string): string | null {
  return value.trim() ? null : "名称不能为空";
}

export function validateHref(value: string): string | null {
  // 允许没有链接。
  if (!value) {
    return null;
  }

  // URL API 会自动处理一部分空格，因此这里必须显式禁止。
  if (/\s/.test(value)) {
    return "链接不能包含空格或换行";
  }

  try {
    new URL(value);
    return null;
  } catch {
    return "请输入合法的 URL";
  }
}
