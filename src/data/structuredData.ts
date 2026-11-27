// schema.org JSON-LD for every prerendered page, built from the same data as
// the visible content. Used by scripts/prerender.mjs via src/entry-server.tsx.
import type { BuildingKey } from "./cityLayout";
import { PANEL_TITLES, PORTFOLIO_DATA, type Project } from "./portfolioData";
import { HOME_META, PERSON_ID, SECTION_META, SITE_NAME, SITE_URL, WEBSITE_ID } from "./siteMeta";

type Node = Record<string, unknown>;

export const personNode = (): Node => ({
  "@type": "Person",
  "@id": PERSON_ID,
  name: "Junjie Wu",
  givenName: "Junjie",
  familyName: "Wu",
  url: `${SITE_URL}/`,
  image: `${SITE_URL}/headshot.jpg`,
  email: `mailto:${PORTFOLIO_DATA.contact.email}`,
  jobTitle: "Software Engineer",
  description: PORTFOLIO_DATA.about.facts,
  alumniOf: { "@type": "CollegeOrUniversity", name: "UNSW Sydney", url: "https://www.unsw.edu.au/" },
  knowsAbout: [
    "C++", "CUDA", "GPU Programming", "Unreal Engine 5", "Graphics Pipelines", "Graphics Algorithms", "Performance Optimisation",
    "Machine Learning", "FPGA Design", "Verilog", "Digital Design", "Power Electronics", "Embedded Systems",
  ],
  address: { "@type": "PostalAddress", addressLocality: "Sydney", addressRegion: "NSW", addressCountry: "AU" },
  sameAs: PORTFOLIO_DATA.contact.links.map((link) => link.url),
});

export const websiteNode = (): Node => ({
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  url: `${SITE_URL}/`,
  name: SITE_NAME,
  inLanguage: "en-AU",
  about: { "@id": PERSON_ID },
  publisher: { "@id": PERSON_ID },
});

const breadcrumbNode = (items: { name: string; url: string }[]): Node => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: item.url,
  })),
});

const graph = (...nodes: Node[]) => ({ "@context": "https://schema.org", "@graph": [personNode(), websiteNode(), ...nodes] });

export const homeJsonLd = () =>
  graph({
    "@type": "ProfilePage",
    "@id": `${SITE_URL}/#profilepage`,
    url: `${SITE_URL}/`,
    name: HOME_META.title,
    description: HOME_META.description,
    dateModified: HOME_META.updated,
    isPartOf: { "@id": WEBSITE_ID },
    mainEntity: { "@id": PERSON_ID },
  });

export const sectionJsonLd = (key: BuildingKey) => {
  const meta = SECTION_META[key];
  const url = `${SITE_URL}${meta.path}`;
  const page: Node = {
    "@type": key === "projects" ? "CollectionPage" : key === "about" ? "AboutPage" : key === "contact" ? "ContactPage" : "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: meta.title,
    description: meta.description,
    dateModified: meta.updated,
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": PERSON_ID },
  };
  if (key === "projects") {
    page.mainEntity = {
      "@type": "ItemList",
      itemListElement: PORTFOLIO_DATA.projects.map((project, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${SITE_URL}/projects/${project.slug}`,
        name: project.title,
      })),
    };
  }
  return graph(page, breadcrumbNode([
    { name: "Home", url: `${SITE_URL}/` },
    { name: PANEL_TITLES[key], url },
  ]));
};

export const projectImageUrl = (project: Project) => `${SITE_URL}/og/${project.slug}.png`;

export const projectJsonLd = (project: Project) => {
  const url = `${SITE_URL}/projects/${project.slug}`;
  const work: Node = {
    "@type": project.githubUrl ? "SoftwareSourceCode" : "CreativeWork",
    "@id": `${url}#work`,
    name: project.title,
    description: project.description,
    url,
    dateCreated: project.started,
    dateModified: project.updated,
    keywords: project.stack.join(", "),
    image: projectImageUrl(project),
    author: { "@id": PERSON_ID },
    inLanguage: "en-AU",
    ...(project.organisation ? { sourceOrganization: { "@type": "Organization", name: project.organisation } } : {}),
    ...(project.githubUrl ? { codeRepository: project.githubUrl } : {}),
  };
  return graph(work, breadcrumbNode([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Projects", url: `${SITE_URL}/projects` },
    { name: project.title, url },
  ]));
};
