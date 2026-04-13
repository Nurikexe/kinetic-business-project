export default function Header({ right }) {
  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl flex justify-between items-center w-full px-6 py-4 border-b border-outline-variant/10">
      <div className="flex items-center gap-2">
        <span className="text-2xl font-black italic tracking-tighter text-primary-fixed font-headline uppercase">
          KINETIC
        </span>
      </div>
      {right && <div className="flex items-center gap-3">{right}</div>}
    </header>
  );
}
