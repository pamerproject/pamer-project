export interface RoomTheme {
  id: string;
  label: string;
  bg: string;
  sidebarBg?: string;
}

export const ROOM_THEMES: RoomTheme[] = [
  { id: "default", label: "Default", bg: "" },
  { id: "warm", label: "Hangat", bg: "linear-gradient(135deg, #fff5f0 0%, #ffe8d6 50%, #fddbc8 100%)" },
  { id: "ocean", label: "Laut", bg: "linear-gradient(135deg, #eef6ff 0%, #dce8f5 50%, #c9ddf5 100%)" },
  { id: "forest", label: "Alam", bg: "linear-gradient(135deg, #f0faf0 0%, #dceddc 50%, #cce8cc 100%)" },
];

export function getTheme(id?: string | null): RoomTheme {
  return ROOM_THEMES.find((t) => t.id === id) || ROOM_THEMES[0];
}
