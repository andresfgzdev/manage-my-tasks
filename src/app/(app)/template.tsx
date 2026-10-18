// A template remounts on every navigation: each view eases in instead of popping.
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-view-in">{children}</div>;
}
