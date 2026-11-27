// Per-page metadata for the prerendered document pages. Titles and meta
// descriptions are written by hand (140 to 160 characters, checked at build).
import type { BuildingKey } from "./cityLayout";

export const SITE_URL = "https://www.junjiewu.com";
export const SITE_NAME = "Junjie Wu";
export const PERSON_ID = `${SITE_URL}/#person`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

export type PageMeta = {
  path: string;
  title: string;
  /** Visible <h1> on the document page. */
  heading: string;
  description: string;
  /** ISO date the page's content last changed (sitemap lastmod). */
  updated: string;
};

export const HOME_META: PageMeta = {
  path: "/",
  title: "Junjie Wu | C++ Software Engineer",
  heading: "Junjie Wu",
  description:
    "Junjie Wu is a C++ software engineer and electrical engineer from UNSW Sydney who builds high-performance real-time software, GPU tooling and FPGA designs.",
  updated: "2026-11-27",
};

export const SECTION_META: Record<BuildingKey, PageMeta> = {
  about: {
    path: "/about",
    title: "About | Junjie Wu",
    heading: "About Junjie Wu",
    description:
      "About Junjie Wu: UNSW Sydney graduate in Electrical Engineering and Computer Science and former Tencent software engineering intern, based in Sydney, Australia.",
    updated: "2026-11-27",
  },
  projects: {
    path: "/projects",
    title: "Projects | Junjie Wu",
    heading: "Projects",
    description:
      "Projects by Junjie Wu in low-latency C++, machine learning, systems programming, embedded firmware, power electronics and FPGA digital design, with write-ups.",
    updated: "2026-11-27",
  },
  experience: {
    path: "/experience",
    title: "Experience | Junjie Wu",
    heading: "Experience",
    description:
      "Junjie Wu's experience: Software Engineering Intern at Tencent in Sydney (C++, CUDA, GPU programming, Unreal Engine 5) and Lab Demonstrator at UNSW Sydney.",
    updated: "2026-11-27",
  },
  skills: {
    path: "/skills",
    title: "Skills | Junjie Wu",
    heading: "Skills",
    description:
      "Junjie Wu's technical skills: C++, CUDA, Python, Unreal Engine 5, PyTorch, Verilog and FPGA design, power electronics, embedded systems and developer tools.",
    updated: "2026-11-27",
  },
  contact: {
    path: "/contact",
    title: "Contact | Junjie Wu",
    heading: "Contact",
    description:
      "Contact Junjie Wu, a Sydney-based C++ software engineer and electrical engineer, by email at jaywu0046@gmail.com or through his GitHub and LinkedIn profiles.",
    updated: "2026-11-27",
  },
};

export const NAV_ITEMS: { key: BuildingKey; label: string; href: string }[] = [
  { key: "about", label: "About", href: "/about" },
  { key: "experience", label: "Experience", href: "/experience" },
  { key: "projects", label: "Projects", href: "/projects" },
  { key: "skills", label: "Skills", href: "/skills" },
  { key: "contact", label: "Contact", href: "/contact" },
];

export const NOT_FOUND_META = {
  title: "Page not found | Junjie Wu",
  description: "This page does not exist. Visit the homepage or browse Junjie Wu's projects.",
};

export const projectTitle = (title: string) => `${title} | ${SITE_NAME}`;
