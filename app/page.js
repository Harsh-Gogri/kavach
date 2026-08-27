import SiteFooter from "../components/SiteFooter";
import SiteNav from "../components/SiteNav";

export default function Home() {
  return (
    <main className="site-shell">
      <SiteNav />

      <section className="action-grid action-grid-two" aria-label="Complaint actions">
        <article className="action-box">
          <div className="action-copy">
            <h1>Register a complaint</h1>
            <p>File a report for financial fraud, harassment, or any other cyber crime, and get a acknowledgement number you can track later.</p>
          </div>
          <a className="button button-primary" href="/report">
            Report a complaint
          </a>
        </article>
        <article className="action-box">
          <div className="action-copy">
            <h2>Track your complaint</h2>
            <p>Enter your acknowledgement number to check the current status and see what action has been taken so far.</p>
          </div>
          <a className="button button-outline" href="/track">
            Track status
          </a>
        </article>
      </section>

      <section className="action-grid" aria-label="Helpline action">
        <article className="action-box helpline-box">
          <div className="helpline-content">
            <div className="action-copy">
              <h2>Call the helpline</h2>
              <p>Reach the 1930 cyber crime helpline directly for urgent, time-sensitive cases where a bank transaction can still be reversed.</p>
            </div>
            <a className="button button-primary" href="tel:1930">
              Call 1930
            </a>
          </div>
        </article>
      </section>

      <section className="action-grid action-grid-two" aria-label="Community actions">
        <article className="action-box">
          <div className="action-copy">
            <h2>Report a suspect</h2>
            <p>Flag a phone number, email address, or website that's being used in a scam, so it can be investigated and blocked.</p>
          </div>
          <a className="button button-outline" href="#suspect">
            Report suspect
          </a>
        </article>
        <article className="action-box">
          <div className="action-copy">
            <h2>Cyber volunteers</h2>
            <p>Join as a registered volunteer to help identify, flag, and report unlawful content circulating online.</p>
          </div>
          <a className="button button-outline" href="#volunteer">
            Join as volunteer
          </a>
        </article>
      </section>

      <SiteFooter />
    </main>
  );
}
