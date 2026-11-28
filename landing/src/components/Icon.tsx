// Line icons used in place of image previews, so cards stay sharp at any size.
export const ICON_PATHS: Record<string, string> = {
  directory: "M9 3h6v5H9zM3 16h6v5H3zM15 16h6v5h-6zM12 8v4M6 16v-4h12v4",
  joiner: "M15 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M8.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19 8v6M22 11h-6",
  leaver: "M15 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M8.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM16 11h6",
  audit: "M9 4h6v3H9zM15 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2M9 14l2 2 4-4",
  endpoint: "M3 5h18v11H3zM8 20h8M12 16v4M9.5 10.5l1.8 1.8 3.4-3.4",
  IAM: "M15.5 7.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0zM12 11v10M12 17h3M12 14h2",
  IGA: "M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6zM9 12l2 2 4-4",
  Homelab: "M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01",
  BAU: "M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01",
  Hardware: "M7 7h10v10H7zM10 10h4v4h-4zM9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4",
  Formal: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8 12l3 3 5-6",
  Embedded: "M7 3h10v18H7zM11 18h2",
  post: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5",
};
export default function Icon({ name, className = "icon-tile__svg" }: { name: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICON_PATHS[name] ?? ICON_PATHS.post} />
    </svg>
  );
}
