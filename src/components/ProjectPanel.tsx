import { useMemo } from "react";
import { useMatch, useNavigate } from "react-router-dom";
import { PORTFOLIO_DATA, projectSlug } from "../data/portfolioData";
import AmbientSoundMonitorSystemDetails from "./projects/AmbientSoundMonitorSystemDetails";
import GuitarPowerAmplifierDetails from "./projects/GuitarPowerAmplifierDetails";

type ProjectPanelProps = {
  onClose: () => void;
};

const ProjectPanel = ({ onClose }: ProjectPanelProps) => {
  const match = useMatch("/projects/:slug");
  const slug = match?.params.slug;
  const navigate = useNavigate();
  const project = useMemo(
    () => PORTFOLIO_DATA.projects.find((item) => projectSlug(item.title) === slug),
    [slug]
  );

  const renderProjectDetails = () => {
    switch (slug) {
      case "guitar-power-amplifier":
        return <GuitarPowerAmplifierDetails />;
      case "ambient-sound-monitor-system":
        return <AmbientSoundMonitorSystemDetails />;
      default:
        if (!project) return null;
        return (
          <>
            {project.image && (
              <div className="project-thumb project-thumb-detail">
                <img src={project.image} alt={project.title} />
              </div>
            )}
            <p>{project.description}</p>
            <div className="chip-row">
              {project.stack.map((tech) => (
                <span className="chip" key={tech}>
                  {tech}
                </span>
              ))}
            </div>
          </>
        );
    }
  };

  const handleClose = () => {
    onClose();
  };

  const handleNotFound = () => {
    navigate("/");
  };

  return (
    <>
      <aside className="portfolio-panel open project-panel">
        <div className="panel-header">
          <div>
            <h2>{project ? project.title : "Project not found"}</h2>
            {project && <p className="muted">{project.date}</p>}
          </div>
          <button type="button" className="ghost-button" onClick={handleClose}>
            Close
          </button>
        </div>
        <div className="panel-body">
          {project ? (
            <div className="panel-section">
              {renderProjectDetails()}
            </div>
          ) : (
            <div className="panel-section">
              <p>We couldn't find that project.</p>
              <button type="button" className="ghost-button" onClick={handleNotFound}>
                Back to home
              </button>
            </div>
          )}
        </div>
      </aside>
      <div className="panel-overlay visible" onClick={handleClose} />
    </>
  );
};

export default ProjectPanel;
