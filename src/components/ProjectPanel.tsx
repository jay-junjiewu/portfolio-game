import { useEffect, useMemo, useRef } from "react";
import { useMatch, useNavigate } from "react-router-dom";
import { PORTFOLIO_DATA, projectSlug } from "../data/portfolioData";
import { absoluteImage, applyRouteMeta, injectJsonLd, SITE_URL } from "../utils/routeMeta";
import Picture from "./Picture";
import AmbientSoundMonitorSystemDetails from "./projects/AmbientSoundMonitorSystemDetails";
import AudioEqualiserDetails from "./projects/AudioEqualiserDetails";
import GuitarPowerAmplifierDetails from "./projects/GuitarPowerAmplifierDetails";
import PersonalPortfolioDetails from "./projects/PersonalPortfolioDetails";
import RankItDetails from "./projects/RankItDetails";
import SunswiftDetails from "./projects/SunswiftDetails";
import VirtualMemorySimulatorDetails from "./projects/VirtualMemorySimulatorDetails";
import VinoosDetails from "./projects/VinoosDetails";
import VoltagePlanningToolDetails from "./projects/VoltagePlanningToolDetails";

type ProjectPanelProps = {
  onClose: () => void;
};

const ProjectPanel = ({ onClose }: ProjectPanelProps) => {
  const match = useMatch("/projects/:slug");
  const slug = match?.params.slug;
  const navigate = useNavigate();
  const asideRef = useRef<HTMLElement | null>(null);
  const project = useMemo(
    () => PORTFOLIO_DATA.projects.find((item) => projectSlug(item.title) === slug),
    [slug]
  );

  // Move focus into the project panel when it opens.
  useEffect(() => {
    asideRef.current?.focus();
  }, [slug]);

  // Per-route metadata (title/description/canonical/OG/Twitter) so each project
  // URL reads correctly for JS-rendering crawlers and when shared. Restored on
  // unmount / navigation back to the homepage.
  useEffect(() => {
    if (!project) {
      return applyRouteMeta({
        title: "Project not found — Junjie Wu",
        description: "The project you are looking for could not be found.",
        canonical: `${SITE_URL}/`,
        image: absoluteImage(),
      });
    }

    const description = project.description.replace(/\s+/g, " ").trim().slice(0, 200);
    const url = `${SITE_URL}/projects/${slug}`;
    const restoreMeta = applyRouteMeta({
      title: `${project.title} — Junjie Wu`,
      description,
      canonical: url,
      image: absoluteImage(project.image),
    });

    // Per-project structured data: SoftwareSourceCode when there's a repo, else
    // a generic CreativeWork, plus a Home → Projects → title breadcrumb.
    const work = {
      "@type": project.githubUrl ? "SoftwareSourceCode" : "CreativeWork",
      name: project.title,
      description,
      url,
      author: { "@id": `${SITE_URL}/#person` },
      keywords: project.stack.join(", "),
      ...(project.image ? { image: absoluteImage(project.image) } : {}),
      ...(project.githubUrl
        ? { codeRepository: project.githubUrl, programmingLanguage: project.stack }
        : {}),
    };
    const breadcrumb = {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Projects", item: `${SITE_URL}/projects` },
        { "@type": "ListItem", position: 3, name: project.title, item: url },
      ],
    };
    const restoreJsonLd = injectJsonLd("ld-project", {
      "@context": "https://schema.org",
      "@graph": [work, breadcrumb],
    });

    return () => {
      restoreMeta();
      restoreJsonLd();
    };
  }, [project, slug]);

  const renderProjectDetails = () => {
    switch (slug) {
      case "audio-equaliser-in-c":
        return <AudioEqualiserDetails />;
      case "guitar-power-amplifier":
        return <GuitarPowerAmplifierDetails />;
      case "ambient-sound-monitor-system":
        return <AmbientSoundMonitorSystemDetails />;
      case "sunswift-racing-mppt-project":
        return <SunswiftDetails />;
      case "machine-learning-and-voltage-risk-modelling":
        return <VoltagePlanningToolDetails />;
      case "virtual-memory-system-emulator-c":
        return <VirtualMemorySimulatorDetails />;
      case "personal-portfolio":
        return <PersonalPortfolioDetails />;
      case "vinoos-website-freelance":
        return <VinoosDetails />;
      case "rankit-website-hackathon":
        return <RankItDetails />;
      default:
        if (!project) return null;
        return (
          <>
            {project.image && (
              <div className="project-thumb project-thumb-detail">
                <Picture src={project.image} alt={project.title} />
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
      <aside
        ref={asideRef}
        tabIndex={-1}
        aria-label={project ? project.title : "Project not found"}
        className="portfolio-panel open project-panel"
      >
        <div className="panel-header">
          <div>
            <h2>{project ? project.title : "Project not found"}</h2>
            {project && <p className="muted">{project.date}</p>}
          </div>
          <button type="button" className="ghost-button" onClick={handleClose}>
            Back
          </button>
        </div>
        <div className="panel-body" id="panel-body">
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
