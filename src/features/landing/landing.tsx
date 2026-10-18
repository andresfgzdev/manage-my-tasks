import Link from "next/link";
import { HeroLine } from "./hero-line";
import { How } from "./how";
import { LocalTime, Reveal } from "./motion";
import { PanelNotes } from "./panel-notes";
import { Views } from "./views";
import "./landing.css";

/** Where "Log in" goes. */
export const LOGIN_HREF = "/login";
/** Where the primary action opens the app. */
export const APP_HREF = "/today";

const FAQ = [
  {
    q: "Which times does it understand?",
    a: "24-hour times like 15:30, 12-hour times like 3pm or 3:30pm, and ranges such as 13:30 to 15:30 or 13:30-15:30. The first time in the line is the start.",
  },
  {
    q: "How do I say how long something takes?",
    a: "Add ~45m or ~2h. A range gives the length too, and if you write both, the ~ length wins.",
  },
  {
    q: "What do the exclamation marks do?",
    a: "They set the priority: ! is low, !! is medium and !!! is high. They are taken out of the title.",
  },
  {
    q: "Can one task have several tags?",
    a: "Yes. Write #work,home as one word, or #work #home apart. A task keeps up to eight tags.",
  },
  {
    q: "What happens if I give no time or day?",
    a: "Write today or tomorrow to pick the day. A line with a time goes on today. A line with neither, added from the Inbox, stays there until you give it a day.",
  },
  {
    q: "Can I change a task after I write it?",
    a: "Right-click any task for its menu, open its details inline to add steps and a note, or use the edit dialog to change everything at once.",
  },
  {
    q: "How do I plan a whole week?",
    a: "Open Week. Drag across empty hours to make a block, drag a block to another hour or day, pull its edge to resize it, and click it for its actions.",
  },
];

export function Landing() {
  return (
    <div className="bt">
      <Reveal />
      <header className="bt-nav">
        <Link href="/" className="bt-nav__mark">Better Tasks</Link>
        <nav className="bt-nav__links" aria-label="Page">
          <a href="#views">Views</a>
          <a href="#how">How it works</a>
          <a href="#questions">Questions</a>
        </nav>
        <div className="bt-nav__act">
          <Link href={LOGIN_HREF} className="bt-nav__login">Log in</Link>
          <Link href={APP_HREF} className="bt-btn bt-btn--small">Open the app</Link>
        </div>
      </header>

      <main>
        <section className="bt-hero" aria-labelledby="hero-title">
          <div className="bt-hero__words">
            <h1 id="hero-title" className="bt-display bt-lines">
              <span className="bt-line"><span data-line style={{ "--i": 0 } as React.CSSProperties}>Type a task.</span></span>
              <span className="bt-line"><span data-line style={{ "--i": 1 } as React.CSSProperties}>It finds its hour.</span></span>
            </h1>
            <p className="bt-hero__lede bt-after">
              Better Tasks reads the time, the length, the priority and the tags from one line, then puts the
              task on your day, right under the marker for now.
            </p>
            <div className="bt-hero__actions bt-after">
              <Link href={APP_HREF} className="bt-btn">Open today</Link>
              <span className="bt-hero__hint">Try the box on the right first. It runs the real parser.</span>
            </div>
          </div>
          <div className="bt-hero__stage">
            <div className="bt-hero__float">
              <HeroLine />
            </div>
          </div>
        </section>

        <section id="views" className="bt-section">
          <Views />
        </section>

        <section id="how" className="bt-section bt-field">
          <How />
        </section>

        <section className="bt-section">
          <PanelNotes />
        </section>

        <section id="questions" className="bt-section bt-faq">
          <h2 className="bt-h2 bt-faq__head" data-reveal>Fair questions</h2>
          <div className="bt-faq__list">
            {FAQ.map((f, i) => (
              <details key={f.q} name="faq" className="bt-tile-q" open={i === 0} data-reveal>
                <summary>
                  <span>{f.q}</span>
                  <span className="bt-plus" aria-hidden />
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="bt-section bt-field bt-close" data-stagger>
          <h2 className="bt-display">
            <span className="bt-br">Your day,</span> <span className="bt-br">one line at a time.</span>
          </h2>
          <form action={APP_HREF} className="bt-close__form">
            <label htmlFor="close-line" className="sr-only">Your first task</label>
            <input id="close-line" name="line" placeholder="Call mum 7pm ~20m #home" autoComplete="off" spellCheck={false} />
            <button type="submit" className="bt-btn">Open today</button>
          </form>
          <p className="bt-close__note">
            Opens your Today view with this line waiting in the Line. Press Enter there to add it.
          </p>
        </section>
      </main>

      <footer className="bt-foot">
        <div className="bt-tile bt-tile--say" data-reveal>
          <p>A task manager that reads one line and puts it on your day.</p>
          <small>© 2026 Better Tasks</small>
        </div>
        <nav className="bt-tile bt-tile--nav" aria-label="App" data-reveal>
          <Link href="/today">Today</Link>
          <Link href="/next">Next</Link>
          <Link href="/inbox">Inbox</Link>
          <Link href="/week">Week</Link>
        </nav>
        <div className="bt-tile bt-tile--time" data-reveal>
          <LocalTime />
        </div>
        <div className="bt-tile bt-tile--login" data-reveal>
          <span>Already have tasks?</span>
          <Link href={LOGIN_HREF} className="bt-tile__link">Log in</Link>
        </div>
        <div className="bt-tile bt-tile--mark" aria-hidden data-reveal>Better Tasks</div>
        <Link href={APP_HREF} className="bt-tile bt-tile--go" data-reveal>
          <span>Plan today</span>
          <svg viewBox="0 0 48 48" width="56" height="56" aria-hidden>
            <path d="M10 38 L38 10 M16 10 H38 V32" fill="none" stroke="currentColor" strokeWidth="4" />
          </svg>
        </Link>
      </footer>
    </div>
  );
}
