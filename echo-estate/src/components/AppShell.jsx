import Navbar from './Navbar';

/**
 * AppShell — light warm wrapper for all authenticated inner pages.
 * Replaces the old dark sidebar layout.
 */
export default function AppShell({ children, title, eyebrow }) {
  return (
    <div className="app-shell">
      <Navbar />
      {/* Page header */}
      {(title || eyebrow) && (
        <header className="mx-auto max-w-5xl px-4 sm:px-6 pt-24 pb-0">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          {title && (
            <h1 className="mt-1 text-2xl font-semibold text-ink">{title}</h1>
          )}
        </header>
      )}
      <main className="app-shell-main">{children}</main>
    </div>
  );
}
