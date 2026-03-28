export function Watermark() {
  return (
    <a
      href="https://TheoroX.com"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        fontSize: '13px',
        fontWeight: 500,
        color: 'inherit',
        opacity: 0.6,
        textDecoration: 'none',
        transition: 'opacity 0.2s ease',
        zIndex: 50,
        pointerEvents: 'auto',
      }}
      className="max-[767px]:!bottom-[4px] max-[767px]:!right-[4px] max-[767px]:!text-[11px]"
      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.5')}
    >
      Powered by TheoroX
    </a>
  );
}
