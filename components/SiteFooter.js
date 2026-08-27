export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-links">
        <a href="#terms">Terms</a>
        <a href="#privacy">Privacy</a>
      </div>
      <div className="footer-socials" id="socials" aria-label="Social media links">
        <a href="#instagram" aria-label="Instagram">
          <img src="/assets/instagram.png" alt="" aria-hidden="true" />
        </a>
        <a href="#twitter" aria-label="Twitter">
          <img src="/assets/twitter.png" alt="" aria-hidden="true" />
        </a>
        <a href="#facebook" aria-label="Facebook">
          <img src="/assets/facebook.png" alt="" aria-hidden="true" />
        </a>
      </div>
    </footer>
  );
}
