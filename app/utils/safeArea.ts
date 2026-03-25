export function getScreenContentBottomPadding(
  bottomInset: number,
  mode: "default" | "form" | "compact" = "default"
) {
  if (mode === "form") {
    return Math.max(156, bottomInset + 118);
  }

  if (mode === "compact") {
    return Math.max(96, bottomInset + 70);
  }

  return Math.max(132, bottomInset + 92);
}
