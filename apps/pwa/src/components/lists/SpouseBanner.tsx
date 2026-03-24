export function SpouseBanner({ userName }: { userName?: string }) {
  return (
    <div className="list-spouse-banner" role="status">
      Viewing as household member{userName ? ` — ${userName} manages these lists` : ''}.
    </div>
  );
}
