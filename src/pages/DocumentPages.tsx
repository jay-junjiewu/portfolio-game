import type { MouseEvent, ReactNode } from "react";
import {
  AboutSection,
  ContactSection,
  ExperienceSection,
  ProjectArticle,
  ProjectCard,
  ProjectOrganisation,
  SkillsSection,
  isPlainClick,
} from "../components/content/PortfolioContent";
import type { BuildingKey } from "../data/cityLayout";
import { PANEL_TITLES, PORTFOLIO_DATA, relatedProjects, type Project, type ProjectCategory } from "../data/portfolioData";
import { HOME_META, SECTION_META } from "../data/siteMeta";
import DocumentLayout, { IslandIcon } from "./DocumentLayout";

const CATEGORY_LABELS: Record<ProjectCategory, string> = { software: "Software", electrical: "Electrical" };
const CATEGORIES: ProjectCategory[] = ["software", "electrical"];

const islandHref = (key: BuildingKey) => `/?panel=${key}`;

const SectionPage = ({ section, intro, children }: { section: BuildingKey; intro?: string; children: ReactNode }) => (
  <DocumentLayout
    current={section}
    islandHref={islandHref(section)}
    breadcrumbs={[{ label: "Home", href: "/" }, { label: PANEL_TITLES[section] }]}
  >
    <header className="doc-page-header">
      <h1>{SECTION_META[section].heading}</h1>
      {intro && <p className="doc-lead">{intro}</p>}
    </header>
    <div className="doc-content">{children}</div>
  </DocumentLayout>
);

export const AboutPage = () => (
  <SectionPage section="about">
    <AboutSection nameHeading="p" />
  </SectionPage>
);

export const ExperiencePage = () => (
  <SectionPage section="experience">
    <ExperienceSection itemHeading="h2" />
    <p className="doc-note">
      Engineering work for other organisations is listed under <a href="/projects">Projects</a>.
    </p>
  </SectionPage>
);

export const SkillsPage = () => (
  <SectionPage section="skills">
    <SkillsSection itemHeading="h2" />
  </SectionPage>
);

export const ContactPage = () => (
  <SectionPage section="contact" intro="Email is the fastest way to reach me. I usually reply within a day or two.">
    <ContactSection />
  </SectionPage>
);

const ProjectGroups = ({ groupHeading, cardHeading }: { groupHeading: "h2" | "h3"; cardHeading: "h3" | "h4" }) => {
  const Group = groupHeading;
  return (
    <>
      {CATEGORIES.map((category) => (
        <section key={category} className="doc-project-group" aria-labelledby={`projects-${category}`}>
          <Group id={`projects-${category}`}>{CATEGORY_LABELS[category]}</Group>
          <div className="doc-project-grid">
            {PORTFOLIO_DATA.projects
              .filter((project) => project.category === category)
              .map((project) => (
                <ProjectCard key={project.slug} project={project} heading={cardHeading} />
              ))}
          </div>
        </section>
      ))}
    </>
  );
};

export const ProjectsPage = () => (
  <SectionPage section="projects" intro={SECTION_META.projects.description}>
    <ProjectGroups groupHeading="h2" cardHeading="h3" />
  </SectionPage>
);

export const ProjectPage = ({ project }: { project: Project }) => (
  <DocumentLayout
    current="projects"
    islandHref={`/?panel=projects&project=${project.slug}`}
    breadcrumbs={[
      { label: "Home", href: "/" },
      { label: "Projects", href: "/projects" },
      { label: project.title },
    ]}
  >
    <article className="doc-article">
      <header className="doc-page-header">
        <h1>{project.title}</h1>
        <ProjectOrganisation project={project} />
        <p className="muted">{project.date}</p>
      </header>
      <div className="doc-content">
        <ProjectArticle project={project} outlineHeading />
      </div>
    </article>
    <aside className="doc-related" aria-labelledby="related-projects">
      <h2 id="related-projects">Related projects</h2>
      <div className="doc-project-grid">
        {relatedProjects(project).map((related) => (
          <ProjectCard key={related.slug} project={related} heading="h3" />
        ))}
      </div>
      <p className="doc-inline-links">
        <a href="/projects">All projects</a>
        <a href={`/?panel=projects&project=${project.slug}`}>Explore on the island</a>
      </p>
    </aside>
  </DocumentLayout>
);

export const NotFoundPage = () => (
  <DocumentLayout>
    <header className="doc-page-header">
      <h1>Page not found</h1>
      <p className="doc-lead">The page you were looking for does not exist or has moved.</p>
    </header>
    <p className="doc-actions">
      <a className="doc-button" href="/">Go to the homepage</a>
      <a className="doc-button doc-button-quiet" href="/projects">Browse projects</a>
    </p>
  </DocumentLayout>
);

type SimpleHomeProps = {
  /** Switches to the 3D island without a page load; the link still works without JS. */
  onExploreIsland?: () => void;
};

/** Flips the shared day/night choice (the island reads the same storage key). */
const toggleTheme = () => {
  const root = document.documentElement;
  const current = root.dataset.theme ?? (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "night" : "day");
  const next = current === "night" ? "day" : "night";
  root.dataset.theme = next;
  try {
    window.localStorage.setItem("ui:dayMode", next);
  } catch { /* The choice then lasts for this visit only. */ }
};

const SunIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></svg>
);
const MoonIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14A8.5 8.5 0 0 1 10 4a8.5 8.5 0 1 0 10 10Z" /></svg>
);

/** The one-page "Simple view" of the homepage, also its prerendered HTML. */
export const SimpleHome = ({ onExploreIsland }: SimpleHomeProps) => {
  const handleIsland = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onExploreIsland || !isPlainClick(event)) return;
    event.preventDefault();
    onExploreIsland();
  };
  return (
    <DocumentLayout
      navMode="anchors"
      headerAction={
        <div className="doc-header-actions">
          <button type="button" className="doc-island-link doc-theme-switch" onClick={toggleTheme} title="Switch between day and night">
            <span className="theme-day"><SunIcon /><span>Daylight</span></span>
            <span className="theme-night"><MoonIcon /><span>Moonlight</span></span>
          </button>
          <a className="doc-island-link" href="/?view=island" onClick={handleIsland}>
            <IslandIcon />
            <span>3D island view</span>
          </a>
        </div>
      }
    >
      <section className="doc-hero" aria-labelledby="home-title">
        <h1 id="home-title">{HOME_META.heading}</h1>
        <p className="doc-hero-role">{PORTFOLIO_DATA.about.headline}</p>
        <p className="doc-lead">{PORTFOLIO_DATA.about.facts}</p>
        <p className="doc-actions">
          <a className="doc-button" href="#projects">See projects</a>
          <a className="doc-button doc-button-quiet" href={`mailto:${PORTFOLIO_DATA.contact.email}`}>Email me</a>
        </p>
      </section>
      <section id="about" className="doc-section" aria-labelledby="about-title">
        <h2 id="about-title">About</h2>
        <p>{PORTFOLIO_DATA.about.body[0]}</p>
      </section>
      <section id="experience" className="doc-section" aria-labelledby="experience-title">
        <h2 id="experience-title">Experience</h2>
        <ExperienceSection itemHeading="h3" />
      </section>
      <section id="projects" className="doc-section" aria-labelledby="projects-title">
        <h2 id="projects-title">Projects</h2>
        <ProjectGroups groupHeading="h3" cardHeading="h4" />
      </section>
      <section id="skills" className="doc-section" aria-labelledby="skills-title">
        <h2 id="skills-title">Skills</h2>
        <SkillsSection itemHeading="h3" />
      </section>
      <section id="contact" className="doc-section" aria-labelledby="contact-title">
        <h2 id="contact-title">Contact</h2>
        <ContactSection />
      </section>
    </DocumentLayout>
  );
};
