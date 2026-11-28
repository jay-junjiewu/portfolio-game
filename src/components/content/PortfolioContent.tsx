// Section content shared by the island panels (on /) and the prerendered
// document pages (/about, /projects/<slug>, ...), so both always show the same
// text. Everything here must render deterministically on the server.
import type { MouseEvent, ReactElement } from "react";
import { PORTFOLIO_DATA, type Project } from "../../data/portfolioData";
import Picture from "../Picture";
import { PROJECT_DETAILS } from "../projects";
import { GithubIcon, LinkedInIcon, MailIcon, PinIcon } from "./icons";

type HeadingLevel = "h2" | "h3" | "h4";

/** True for plain left clicks that the page may handle itself (not new-tab clicks). */
export const isPlainClick = (event: MouseEvent<HTMLAnchorElement>) =>
  !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

export const AboutSection = ({ nameHeading = "h3" }: { nameHeading?: HeadingLevel | "p" }) => {
  const Name = nameHeading;
  return (
    <div className="panel-section about-section">
      <div className="about-header">
        <Picture className="about-photo" src="/headshot.jpg" alt="Junjie Wu" width={84} height={84} loading="eager" />
        <div className="about-intro">
          <Name className="about-name">Junjie Wu</Name>
          <p className="about-role muted">{PORTFOLIO_DATA.about.headline}</p>
        </div>
      </div>
      <p className="about-facts">{PORTFOLIO_DATA.about.facts}</p>
    </div>
  );
};

export const ExperienceSection = ({ itemHeading = "h3" }: { itemHeading?: HeadingLevel }) => {
  const Heading = itemHeading;
  return (
    <div className="panel-section">
      {PORTFOLIO_DATA.experience.map((job) => (
        <article key={`${job.company}-${job.role}`} className="experience-card">
          <Heading>{job.role}</Heading>
          <p className="muted">
            {job.companyUrl ? (
              <a className="experience-company-link" href={job.companyUrl} target="_blank" rel="noreferrer">
                {job.company}
              </a>
            ) : (
              job.company
            )}
            {job.location ? `, ${job.location}` : ""}
            <span className="experience-period">{job.period}</span>
          </p>
          <ul>
            {job.highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
};

export const SkillsSection = ({ itemHeading = "h3" }: { itemHeading?: HeadingLevel }) => {
  const Heading = itemHeading;
  return (
    <div className="panel-section">
      {PORTFOLIO_DATA.skills.map((group) => (
        <div key={group.category} className="skill-group">
          <Heading>{group.category}</Heading>
          <ul className="chip-row skill-chips">
            {group.items.map((item) => (
              <li className="chip" key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

const contactIcons: Record<string, () => ReactElement> = { GitHub: GithubIcon, LinkedIn: LinkedInIcon };

export const ContactSection = () => (
  <div className="panel-section contact-details">
    <div className="contact-grid">
      <a className="contact-card" href={`mailto:${PORTFOLIO_DATA.contact.email}`}>
        <span className="contact-icon"><MailIcon /></span>
        <span className="contact-copy">
          <span className="contact-label">Email</span>
          <span className="contact-value">{PORTFOLIO_DATA.contact.email}</span>
        </span>
      </a>
      <div className="contact-card static">
        <span className="contact-icon location"><PinIcon /></span>
        <span className="contact-copy">
          <span className="contact-label">Location</span>
          <span className="contact-value">{PORTFOLIO_DATA.contact.location}</span>
        </span>
      </div>
    </div>
    <div className="contact-actions">
      {PORTFOLIO_DATA.contact.links.map((link) => {
        const Icon = contactIcons[link.label];
        const displayUrl = link.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
        return (
          <a key={link.label} href={link.url} target="_blank" rel="noreferrer" className="contact-card contact-link-card">
            {Icon && <span className="contact-icon"><Icon /></span>}
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

export const ProjectOrganisation = ({ project }: { project: Project }) =>
  project.organisationLine ? <p className="project-org">{project.organisationLine}</p> : null;

type ProjectCardProps = {
  project: Project;
  heading?: HeadingLevel;
  /** Called on a plain click; the card is still a real link for crawlers and new tabs. */
  onOpen?: (slug: string) => void;
};

export const ProjectCard = ({ project, heading = "h3", onOpen }: ProjectCardProps) => {
  const Heading = heading;
  return (
    <a
      href={`/projects/${project.slug}`}
      className={`project-card project-card-link ${project.image ? "project-card-wide" : "project-card-text"}`}
      onClick={(event) => {
        if (!onOpen || !isPlainClick(event)) return;
        event.preventDefault();
        onOpen(project.slug);
      }}
    >
      {project.image && (
        <div className="project-thumb">
          <Picture src={project.image} alt="" loading="lazy" />
        </div>
      )}
      <div className="project-meta">
        <div className="project-topline">
          <div>
            <Heading>{project.title}</Heading>
            <span className="muted">{project.date}</span>
          </div>
        </div>
        <p>{project.description}</p>
        <div className="chip-row">
          {project.stack.map((tech) => (
            <span className="chip" key={tech}>{tech}</span>
          ))}
        </div>
      </div>
    </a>
  );
};

/**
 * Full project write-up: organisation, summary, the long-form details, then tags.
 * On a document page (title is the <h1>) a visually hidden <h2> keeps the
 * write-up's own <h3> sections in heading order.
 */
export const ProjectArticle = ({ project, outlineHeading = false }: { project: Project; outlineHeading?: boolean }) => {
  const Details = PROJECT_DETAILS[project.slug];
  return (
    <div className="panel-section project-article">
      {project.role && <p className="muted project-role">{project.role}</p>}
      <p className="project-summary">{project.description}</p>
      {project.organisationUrl && (
        <div className="pdf-container">
          <a href={project.organisationUrl} target="_blank" rel="noreferrer" className="pdf-link">
            Visit Website
          </a>
        </div>
      )}
      {Details ? (
        <>
          {outlineHeading && <h2 className="visually-hidden">Project write-up</h2>}
          <Details />
        </>
      ) : (
        <>
          {project.githubUrl && (
            <div className="project-links">
              <a href={project.githubUrl} target="_blank" rel="noreferrer" className="pdf-link">GitHub</a>
            </div>
          )}
          {project.image && (
            <div className="project-thumb project-thumb-detail">
              <Picture src={project.image} alt={project.title} />
            </div>
          )}
          {project.details?.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </>
      )}
      <div className="chip-row project-stack">
        {project.stack.map((tech) => (
          <span className="chip" key={tech}>{tech}</span>
        ))}
      </div>
    </div>
  );
};
