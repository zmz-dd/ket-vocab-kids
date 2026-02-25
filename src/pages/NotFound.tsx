export default function NotFound() {
  return (
    <div className="min-h-[60vh] grid place-items-center">
      <div className="rounded-2xl border-2 border-black/10 bg-white/70 p-6 shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
        <div className="text-2xl font-black font-display">404</div>
        <div className="mt-1 text-sm text-muted-foreground">Page not found / 页面不存在</div>
      </div>
    </div>
  );
}
