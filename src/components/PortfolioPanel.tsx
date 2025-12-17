import type { BuildingKey } from "../data/cityLayout";
import { CITY_LAYOUT } from "../data/cityLayout";
import { PANEL_TITLES, PORTFOLIO_DATA, type ProjectCategory } from "../data/portfolioData";
import { useState } from "react";

type PortfolioPanelProps = {
  activeKey: BuildingKey | null;
  onClose: () => void;
};

const renderContent = (key: BuildingKey, projectsCategory: ProjectCategory, onTabChange: (cat: ProjectCategory) => void) => {
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
            .map((project) => (
              <div key={project.title} className="project-card project-card-wide">
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
                    {project.externalLink && (
                      <a
                        href={project.externalLink}
                        target="_blank"
                        rel="noreferrer"
                        className="chip chip-link external-chip"
                        aria-label="External link"
                      >
                        ↗
                      </a>
                    )}
                  </div>
                  <p>{project.description}</p>
                  <div className="chip-row">
                    {project.stack.map((tech) => (
                      <span className="chip" key={tech}>
                        {tech}
                      </span>
                    ))}
                  </div>
                  <div className="project-links">
                    {project.link && (
                      <a href={project.link} target="_blank" rel="noreferrer" className="chip chip-link">
                        View
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
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
    case "contact":
      return (
        <div className="panel-section contact-details">
          <p>
            Email:{" "}
            <a href={`mailto:${PORTFOLIO_DATA.contact.email}`}>
              {PORTFOLIO_DATA.contact.email}
            </a>
          </p>
          <p>Location: {PORTFOLIO_DATA.contact.location}</p>
          <div className="chip-row">
            {PORTFOLIO_DATA.contact.links.map((link) => (
              <a key={link.label} href={link.url} target="_blank" rel="noreferrer" className="chip chip-link">
                {link.label}
              </a>
            ))}
          </div>
        </div>
      );
    default:
      return null;
  }
};

const PortfolioPanel = ({ activeKey, onClose }: PortfolioPanelProps) => {
  const [projectTab, setProjectTab] = useState<ProjectCategory>("software");
  const isOpen = Boolean(activeKey);
  const building = CITY_LAYOUT.find(
    (entry) => entry.type === "main" && entry.key === activeKey
  );

  return (
    <>
      <aside className={`portfolio-panel ${isOpen ? "open" : ""}`}>
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
              {renderContent(activeKey, projectTab, setProjectTab)}
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
