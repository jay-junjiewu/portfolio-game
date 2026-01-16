import type { BuildingKey } from "../data/cityLayout";
import { CITY_LAYOUT } from "../data/cityLayout";
import { PANEL_TITLES, PORTFOLIO_DATA, projectSlug, type ProjectCategory } from "../data/portfolioData";
import { useState, type KeyboardEvent, type MouseEvent, type ReactElement } from "react";

type PortfolioPanelProps = {
  activeKey: BuildingKey | null;
  onClose: () => void;
  onProjectOpen: (slug: string) => void;
};

const MailIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3.5 7.5L12 13l8.5-5.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PinIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 22s7-7.1 7-12a7 7 0 1 0-14 0c0 4.9 7 12 7 12z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="10" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const GithubIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 2c-5.52 0-10 4.58-10 10.23 0 4.52 2.87 8.36 6.84 9.72.5.1.68-.22.68-.49v-1.7c-2.78.62-3.37-1.2-3.37-1.2-.46-1.19-1.12-1.5-1.12-1.5-.92-.64.07-.63.07-.63 1.01.07 1.54 1.07 1.54 1.07.9 1.57 2.36 1.12 2.94.86.09-.66.35-1.12.63-1.38-2.22-.26-4.56-1.15-4.56-5.09 0-1.12.39-2.03 1.03-2.74-.1-.26-.45-1.3.1-2.7 0 0 .85-.28 2.8 1.05.81-.23 1.68-.34 2.55-.34.87 0 1.74.12 2.55.34 1.94-1.33 2.79-1.05 2.79-1.05.56 1.4.21 2.44.11 2.7.64.71 1.03 1.62 1.03 2.74 0 3.95-2.34 4.82-4.57 5.08.36.32.68.95.68 1.92v2.85c0 .27.18.59.69.49A10.1 10.1 0 0 0 22 12.23C22 6.58 17.52 2 12 2z"
      fill="currentColor"
    />
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect
      x="3"
      y="3"
      width="18"
      height="18"
      rx="3"
      ry="3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <path d="M8 10v6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M8 7.5h.01" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path
      d="M12 16v-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M12 10h3.5a1.5 1.5 0 0 1 1.5 1.5V16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

const renderContent = (
  key: BuildingKey,
  projectsCategory: ProjectCategory,
  onTabChange: (cat: ProjectCategory) => void,
  onProjectOpen: (slug: string) => void
) => {
  switch (key) {
    case "about":
      return (
        <div className="panel-section">
          <h3>{PORTFOLIO_DATA.about.headline}</h3>
          {PORTFOLIO_DATA.about.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      );
    case "projects":
      return (
        <div
          className="panel-section"
          onClick={(e) => {
            const target = e.target as HTMLElement | null;
            const tab = target?.closest<HTMLButtonElement>(".tab");
            if (tab?.dataset.tab === "software" || tab?.dataset.tab === "electrical") {
              onTabChange(tab.dataset.tab as ProjectCategory);
            }
          }}
        >
          <div className="project-tabs">
            {(["software", "electrical"] as ProjectCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                className={`tab ${cat === projectsCategory ? "active" : ""}`}
                data-tab={cat}
              >
                {cat === "software" ? "Software" : "Electrical"}
              </button>
            ))}
          </div>
          {PORTFOLIO_DATA.projects
            .filter((project) => project.category === projectsCategory)
            .map((project) => {
              const slug = projectSlug(project.title);
              const handleCardClick = (event: MouseEvent<HTMLDivElement>) => {
                const target = event.target as HTMLElement;
                if (target.closest("a")) {
                  return;
                }
                onProjectOpen(slug);
              };
              const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onProjectOpen(slug);
                }
              };
              return (
                <div
                  key={project.title}
                  className="project-card project-card-wide project-card-link"
                  role="link"
                  tabIndex={0}
                  onClick={handleCardClick}
                  onKeyDown={handleCardKeyDown}
                >
                {project.image && (
                  <div className="project-thumb">
                    <img src={project.image} alt={project.title} />
                  </div>
                )}
                <div className="project-meta">
                  <div className="project-topline">
                    <div>
                      <h3>{project.title}</h3>
                      <span className="muted">{project.date}</span>
                    </div>
                  </div>
                  <p>{project.description}</p>
                  <div className="chip-row">
                    {project.stack.map((tech) => (
                      <span className="chip" key={tech}>
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
                </div>
              );
            })}
        </div>
      );
    case "skills":
      return (
        <div className="panel-section">
          {PORTFOLIO_DATA.skills.map((group) => (
            <div key={group.category} className="skill-group">
              <h3>{group.category}</h3>
              <p>{group.items.join(" · ")}</p>
            </div>
          ))}
        </div>
      );
    case "experience":
      return (
        <div className="panel-section">
          {PORTFOLIO_DATA.experience.map((job) => (
            <div key={job.company} className="experience-card">
              <h3>{job.role}</h3>
              <p className="muted">
                {job.company} · {job.period}
              </p>
              <ul>
                {job.highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );
    case "contact": {
      const iconMap: Record<string, () => ReactElement> = {
        GitHub: GithubIcon,
        LinkedIn: LinkedInIcon,
      };

      return (
        <div className="panel-section contact-details">
          <div className="contact-grid">
            <a className="contact-card" href={`mailto:${PORTFOLIO_DATA.contact.email}`}>
              <span className="contact-icon">
                <MailIcon />
              </span>
              <span className="contact-copy">
                <span className="contact-label">Email</span>
                <span className="contact-value">{PORTFOLIO_DATA.contact.email}</span>
              </span>
            </a>
            <div className="contact-card static">
              <span className="contact-icon location">
                <PinIcon />
              </span>
              <span className="contact-copy">
                <span className="contact-label">Location</span>
                <span className="contact-value">{PORTFOLIO_DATA.contact.location}</span>
              </span>
            </div>
          </div>
          <div className="contact-actions">
            {PORTFOLIO_DATA.contact.links.map((link) => {
              const Icon = iconMap[link.label];
              const displayUrl = link.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
              return (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="contact-card contact-link-card"
                >
                  {Icon && (
                    <span className="contact-icon">
                      <Icon />
                    </span>
                  )}
                  <span className="contact-copy">
                    <span className="contact-label">{link.label}</span>
                    <span className="contact-value">{displayUrl}</span>
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      );
    }
    default:
      return null;
  }
};

const PortfolioPanel = ({ activeKey, onClose, onProjectOpen }: PortfolioPanelProps) => {
  const [projectTab, setProjectTab] = useState<ProjectCategory>("software");
  const isOpen = Boolean(activeKey);
  const isCompact = activeKey === "about" || activeKey === "skills" || activeKey === "contact";
  const building = CITY_LAYOUT.find(
    (entry) => entry.type === "main" && entry.key === activeKey
  );

  return (
    <>
      <aside className={`portfolio-panel ${isOpen ? "open" : ""} ${isCompact ? "compact" : ""}`}>
        {activeKey ? (
          <>
            <div className="panel-header">
              <div>
                <h2>{PANEL_TITLES[activeKey]}</h2>
              </div>
              <button type="button" className="ghost-button" onClick={onClose}>
                Close
              </button>
            </div>
            <div className="panel-body">
              {renderContent(activeKey, projectTab, setProjectTab, onProjectOpen)}
            </div>
          </>
        ) : (
          <div className="panel-placeholder">
            Click a highlighted building to open its story.
          </div>
        )}
      </aside>
      <div className={`panel-overlay ${isOpen ? "visible" : ""}`} onClick={onClose} />
    </>
  );
};

export default PortfolioPanel;
