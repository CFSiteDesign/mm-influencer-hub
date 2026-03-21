export function Watermark() {
  return (
    <a
      href="https://TheoroX.com"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        position: 'fixed',
        bottom: '12px',
        right: '16px',
        fontSize: '11px',
        color: 'inherit',
        opacity: 0.5,
        textDecoration: 'none',
        transition: 'opacity 0.2s ease',
        zIndex: 50,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.5')}
    >
      Powered by TheoroX
    </a>
  );
}
