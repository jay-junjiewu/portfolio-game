import type { BuildingKey } from "../data/cityLayout";
import { PANEL_TITLES, PORTFOLIO_DATA, type ProjectCategory } from "../data/portfolioData";
import { useEffect, useRef, useState } from "react";
import { useDialogFocus } from "../utils/useDialog";
import { usePanelResize } from "../utils/usePanelResize";
import { AboutSection, ContactSection, ExperienceSection, ProjectCard, SkillsSection } from "./content/PortfolioContent";

type PortfolioPanelProps = {
  activeKey: BuildingKey | null;
  onClose: () => void;
  onProjectOpen: (slug: string) => void;
  onCoverageChange?: (coverage: number) => void;
};

const readProjectCategory = (): ProjectCategory => {
  try {
    const stored = window.localStorage.getItem("ui:projectCategory");
    if (stored === "software" || stored === "electrical") return stored;
  } catch { /* Fall back to the default tab. */ }
  return "software";
};

const ProjectsContent = ({ onProjectOpen }: { onProjectOpen: (slug: string) => void }) => {
  const [category, setCategory] = useState<ProjectCategory>(readProjectCategory);

  useEffect(() => {
    try {
      window.localStorage.setItem("ui:projectCategory", category);
    } catch { /* The tab choice then lasts for this visit. */ }
  }, [category]);

  return (
    <div className="panel-section">
      <div className="project-tabs" role="group" aria-label="Project category">
        {(["software", "electrical"] as ProjectCategory[]).map((cat) => (
          <button key={cat} type="button" className={`tab ${cat === category ? "active" : ""}`} aria-pressed={cat === category} onClick={() => setCategory(cat)}>
            {cat === "software" ? "Software" : "Electrical"}
          </button>
        ))}
      </div>
      {PORTFOLIO_DATA.projects
        .filter((project) => project.category === category)
        .map((project) => (
          <ProjectCard key={project.slug} project={project} onOpen={onProjectOpen} />
        ))}
    </div>
  );
};

const renderContent = (key: BuildingKey, onProjectOpen: (slug: string) => void) => {
  switch (key) {
    case "about":
      return <AboutSection />;
    case "projects":
      return <ProjectsContent onProjectOpen={onProjectOpen} />;
    case "skills":
      return <SkillsSection />;
    case "experience":
      return <ExperienceSection />;
    case "contact":
      return <ContactSection />;
    default:
      return null;
  }
};

const PortfolioPanel = ({ activeKey, onClose, onProjectOpen, onCoverageChange }: PortfolioPanelProps) => {
  const isOpen = Boolean(activeKey);
  const isCompact = activeKey === "about" || activeKey === "skills" || activeKey === "contact";
  const openAtRef = useRef<number | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    openAtRef.current = activeKey ? Date.now() : null;
  }, [activeKey]);

  useDialogFocus(dialogRef, isOpen, activeKey);
  const { style, handleProps, dragging } = usePanelResize(dialogRef, { onCoverageChange, onDismiss: onClose });

  const handleOverlayClick = () => {
    if (openAtRef.current && Date.now() - openAtRef.current < 50) return;
    onClose();
  };

  return (
    <>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role={isOpen ? "dialog" : undefined}
        aria-modal={isOpen ? true : undefined}
        aria-labelledby={isOpen ? "portfolio-panel-title" : undefined}
        aria-hidden={isOpen ? undefined : true}
        inert={!isOpen}
        className={`portfolio-panel ${isOpen ? "open" : ""} ${isCompact ? "compact" : ""}${dragging ? " is-resizing" : ""}`}
        style={style}
      >
        {activeKey && (
          <>
            <div {...handleProps} />
            <div className="panel-header">
              <div>
                <h2 id="portfolio-panel-title">{PANEL_TITLES[activeKey]}</h2>
              </div>
              <button type="button" className="ghost-button" onClick={onClose}>
                Close
              </button>
            </div>
            <div className="panel-body" id="panel-body" key={activeKey}>
              {renderContent(activeKey, onProjectOpen)}
            </div>
          </>
        )}
      </div>
      <div className={`panel-overlay ${isOpen ? "visible" : ""}`} onClick={handleOverlayClick} />
    </>
  );
};

export default PortfolioPanel;
