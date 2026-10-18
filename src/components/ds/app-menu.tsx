"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type MenuItem =
  | { type: "separator" }
  | { type: "heading"; title: string; detail?: string }
  | {
      type: "action";
      label: string;
      icon?: React.ReactNode;
      hint?: string;
      danger?: boolean;
      // Two-step: the first click turns the item into a confirmation.
      confirm?: boolean;
      run(): void;
    };

// A point (right click) or the box of the element the menu hangs from.
export type MenuAnchor = { kind: "point"; x: number; y: number } | { kind: "box"; rect: DOMRect };
type OpenMenu = { items: MenuItem[]; anchor: MenuAnchor };

const MenuContext = createContext<{
  open(anchor: MenuAnchor, items: MenuItem[]): void;
  close(): void;
} | null>(null);

export function useAppMenu() {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error("useAppMenu must be used inside AppMenuProvider");
  return ctx;
}

/** Opens the custom menu on right click; the native one stays for text fields. */
export function useContextMenuHandler(getItems: () => MenuItem[] | null) {
  const { open } = useAppMenu();
  return useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, [contenteditable=true]")) return;
      const items = getItems();
      if (!items) return;
      e.preventDefault();
      e.stopPropagation();
      open({ kind: "point", x: e.clientX, y: e.clientY }, items);
    },
    [getItems, open],
  );
}

export function AppMenuProvider({ children }: { children: React.ReactNode }) {
  const [menu, setMenu] = useState<OpenMenu | null>(null);
  const api = useMemo(
    () => ({
      open: (anchor: MenuAnchor, items: MenuItem[]) => setMenu({ anchor, items }),
      close: () => setMenu(null),
    }),
    [],
  );

  return (
    <MenuContext.Provider value={api}>
      {children}
      {menu && createPortal(<MenuSurface menu={menu} onClose={api.close} />, document.body)}
    </MenuContext.Provider>
  );
}

const MARGIN = 8;

function MenuSurface({ menu, onClose }: { menu: OpenMenu; onClose(): void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [armedIndex, setArmedIndex] = useState<number | null>(null);

  // Place next to the anchor, then keep inside the viewport (measured before paint).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const a = menu.anchor;
    const x = a.kind === "point" ? a.x : a.rect.left;
    const below = a.kind === "point" ? a.y : a.rect.bottom + 6;
    const above = a.kind === "point" ? a.y - height : a.rect.top - height - 6;
    const top = below + height > window.innerHeight - MARGIN ? Math.max(MARGIN, above) : below;
    const left = Math.min(Math.max(MARGIN, x), window.innerWidth - width - MARGIN);
    setPos({ left, top });
    el.querySelector<HTMLElement>("[role=menuitem]")?.focus({ preventScroll: true });
  }, [menu]);

  useEffect(() => {
    const away = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", away, true);
    document.addEventListener("contextmenu", away, true);
    document.addEventListener("keydown", key);
    window.addEventListener("blur", onClose);
    window.addEventListener("resize", onClose);
    window.addEventListener("scroll", onClose, true);
    return () => {
      document.removeEventListener("pointerdown", away, true);
      document.removeEventListener("contextmenu", away, true);
      document.removeEventListener("keydown", key);
      window.removeEventListener("blur", onClose);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);

  const move = (e: React.KeyboardEvent, step: number) => {
    e.preventDefault();
    const items = [...(ref.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
    const at = items.indexOf(document.activeElement as HTMLElement);
    items[(at + step + items.length) % items.length]?.focus();
  };

  return (
    <div
      ref={ref}
      role="menu"
      onKeyDown={(e) => {
        if (e.key === "ArrowDown") move(e, 1);
        else if (e.key === "ArrowUp") move(e, -1);
      }}
      onContextMenu={(e) => e.preventDefault()}
      style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? "visible" : "hidden" }}
      className="fixed z-[100] max-w-[300px] min-w-[220px] origin-top-left animate-menu-in rounded-[14px] border border-line bg-raise/95 p-1.5 shadow-[0_18px_44px_rgb(0_0_0/0.55)] backdrop-blur-md"
    >
      {menu.items.map((item, i) => {
        if (item.type === "separator") {
          return <div key={i} role="separator" className="my-1 h-px bg-line" />;
        }
        if (item.type === "heading") {
          return (
            <div key={i} className="flex flex-col gap-0.5 px-2.5 pt-1.5 pb-2">
              <span className="truncate text-[13px] font-semibold">{item.title}</span>
              {item.detail && (
                <span className="font-mono text-[11px] text-ash-dim">{item.detail}</span>
              )}
            </div>
          );
        }
        const armed = armedIndex === i;
        return (
          <button
            key={i}
            type="button"
            role="menuitem"
            onClick={() => {
              if (item.confirm && !armed) {
                setArmedIndex(i);
                return;
              }
              onClose();
              item.run();
            }}
            className={cn(
              "flex h-9 w-full items-center gap-2.5 rounded-[9px] px-2.5 text-left text-[13px] outline-none transition-[background-color,color,transform] duration-100 active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0",
              item.danger
                ? "text-ember-soft hover:bg-ember/10 focus-visible:bg-ember/10"
                : "text-bone hover:bg-surface focus-visible:bg-surface",
              armed && "bg-ember text-ground hover:bg-ember focus-visible:bg-ember",
            )}
          >
            {item.icon}
            <span className="flex-1 truncate">{armed ? "Click again to confirm" : item.label}</span>
            {item.hint && !armed && (
              <span className="font-mono text-[11px] text-ash-dim">{item.hint}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
