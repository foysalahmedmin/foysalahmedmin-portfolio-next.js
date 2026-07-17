export type TPagePreviewTheme = "light" | "dark";
export type TPagePreviewMotion = "normal" | "reduced";

export const normalizePagePreviewDisplay = (
  input: Readonly<{
    theme?: string | string[];
    motion?: string | string[];
  }>
): Readonly<{
  theme: TPagePreviewTheme;
  motion: TPagePreviewMotion;
}> => ({
  theme: input.theme === "dark" ? "dark" : "light",
  motion: input.motion === "normal" ? "normal" : "reduced",
});
