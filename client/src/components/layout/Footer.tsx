export default function Footer({ developer = 'M Haris' }) {
  return (
    <footer className="mt-auto text-center py-2.5 bg-[rgba(10,24,22,0.95)] border-t border-[rgba(0,191,166,0.25)] text-[#bbb] text-sm">
      <div className="max-container">
        {developer ? (
          <p>
            © 2025 Islamic Debate Platform – Developed by{' '}
            <span className="text-primary font-bold">{developer}</span>
          </p>
        ) : (
          <p>© 2025 Islamic Debate Platform – All Rights Reserved</p>
        )}
      </div>
    </footer>
  );
}
