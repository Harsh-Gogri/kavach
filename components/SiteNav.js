export default function SiteNav() {
  return (
    <nav className="site-nav" aria-label="Main navigation">
      <a className="brand" href="/" aria-label="Cyber Crime Reporting home">
        <img className="brand-logo" src="/assets/logo.png" alt="Cyber Crime Reporting" />
      </a>
      <div className="nav-links">
        <a href="#faq">FAQ</a>
      </div>
      <button className="nav-menu-button" type="button" aria-label="Open navigation menu">
        <img src="/assets/menu.png" alt="" aria-hidden="true" />
      </button>
    </nav>
  );
}