export function Watermark() {
  return (
    <a
      href="https://TheoroX.com"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-1 left-1/2 -translate-x-1/2 md:bottom-4 md:right-4 md:left-auto md:translate-x-0 text-[11px] md:text-[13px] font-medium opacity-60 hover:opacity-80 transition-opacity z-50 no-underline text-inherit pointer-events-auto"
      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.5')}
    >
      Powered by TheoroX
    </a>
  );
}
