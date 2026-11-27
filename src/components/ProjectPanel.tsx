import { useRef } from "react";
import type { Project } from "../data/portfolioData";
import { useDialogFocus } from "../utils/useDialog";
import { usePanelResize } from "../utils/usePanelResize";
import { ProjectArticle, ProjectOrganisation } from "./content/PortfolioContent";

type ProjectPanelProps = {
  project: Project;
  onClose: () => void;
  onCoverageChange?: (coverage: number) => void;
};

/** A project write-up opened over the island at /?panel=projects&project=<slug>. */
const ProjectPanel = ({ project, onClose, onCoverageChange }: ProjectPanelProps) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useDialogFocus(dialogRef, true, project.slug);
  const { style, handleProps, dragging } = usePanelResize(dialogRef, { onCoverageChange, onDismiss: onClose });

  return (
    <>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-panel-title"
        className={`portfolio-panel open project-panel${dragging ? " is-resizing" : ""}`}
        style={style}
      >
        <div {...handleProps} />
        <div className="panel-header">
          <div>
            <h2 id="project-panel-title">{project.title}</h2>
            <ProjectOrganisation project={project} />
            <p className="muted">{project.date}</p>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>
            Back
          </button>
        </div>
        <div className="panel-body" id="panel-body">
          <ProjectArticle project={project} />
          <p className="panel-page-link">
            <a className="text-link" href={`/projects/${project.slug}`}>Open as a page</a>
          </p>
        </div>
      </div>
      <div className="panel-overlay visible" onClick={onClose} />
    </>
  );
};

export default ProjectPanel;
