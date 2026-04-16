/**
 * Admin route layout.
 *
 * The root layout locks <body> to 100dvh with overflow: hidden (so the
 * learner-facing map fills the viewport without page-scrolling). That's
 * wrong for the admin tools, which are long, form-heavy, and need normal
 * page scrolling.
 *
 * This wrapper creates its own scroll context: fills the body height,
 * then scrolls internally when content overflows. Scoped to /admin/* so
 * the learner routes are unaffected.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-full overflow-y-auto">{children}</div>;
}
