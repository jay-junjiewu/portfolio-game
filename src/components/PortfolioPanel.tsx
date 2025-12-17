import type { BuildingKey } from "../data/cityLayout";
import { CITY_LAYOUT } from "../data/cityLayout";
import { PANEL_TITLES, PORTFOLIO_DATA } from "../data/portfolioData";

type PortfolioPanelProps = {
  activeKey: BuildingKey | null;
  onClose: () => void;
};

const renderContent = (key: BuildingKey) => {
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
        <div className="panel-section">
          {PORTFOLIO_DATA.projects.map((project) => (
            <div key={project.title} className="project-card">
              <div className="project-card-heading">
                <h3>{project.title}</h3>
                {project.link && (
                  <a href={project.link} target="_blank" rel="noreferrer">
                    Visit ↗
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
                <p className="muted">{building?.name ?? "Portfolio District"}</p>
                <h2>{PANEL_TITLES[activeKey]}</h2>
              </div>
              <button type="button" className="ghost-button" onClick={onClose}>
                Close
              </button>
            </div>
            <div className="panel-body">{renderContent(activeKey)}</div>
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
