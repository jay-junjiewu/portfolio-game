// Single source of truth for portfolio content. It feeds the island panels,
// the prerendered document pages, the sitemap, JSON-LD, /llms.txt and the chat
// concierge (api/chat.ts), so nothing can drift between them.
//
// Keep this file free of runtime imports: api/chat.ts loads it directly under
// Node ESM, and scripts/prerender.mjs transpiles it on its own.
import type { BuildingKey } from "./cityLayout";

export type ProjectCategory = "software" | "electrical";

export type Project = {
  /** URL slug under /projects/. Never change it without adding a redirect in vercel.json. */
  slug: string;
  title: string;
  /** Short summary (1 to 2 sentences) shown on cards, at the top of the project page, and in llms.txt. */
  description: string;
  /**
   * Extra paragraphs shown only on the project page, for projects without a
   * long-form write-up component in src/components/projects.
   */
  details?: string[];
  /** Hand-written meta description, 140 to 160 characters (checked at build). */
  metaDescription: string;
  /** One-line summary for /llms.txt. */
  llmsLine: string;
  stack: string[];
  category: ProjectCategory;
  /** Human-readable date range shown on the site. */
  date: string;
  /** ISO start month (YYYY-MM), used for schema.org dateCreated. */
  started: string;
  /** ISO date the write-up last changed, used for sitemap lastmod. */
  updated: string;
  /** Organisation the work was done for, shown under the title and in JSON-LD. */
  organisation?: string;
  /** Organisation's website, linked from the project page. */
  organisationUrl?: string;
  /** Short line shown under the title, e.g. "At Ausgrid". */
  organisationLine?: string;
  /** Role(s) held for the organisation. */
  role?: string;
  image?: string;
  githubUrl?: string;
};

export type ExperienceLink = {
  title: string;
  url: string;
  image?: string;
  source?: string;
};

export type ExperienceItem = {
  company: string;
  companyUrl?: string;
  role: string;
  period: string;
  location?: string;
  highlights: string[];
  links?: ExperienceLink[];
};

export type PortfolioContent = {
  about: {
    headline: string;
    /** Factual summary shown on / and /about (and quoted by AI search). */
    facts: string;
    body: string[];
    openTo: string;
  };
  projects: Project[];
  skills: { category: string; items: string[] }[];
  experience: ExperienceItem[];
  contact: {
    email: string;
    location: string;
    links: { label: string; url: string }[];
  };
};

export const projectSlug = (project: Pick<Project, "slug">) => project.slug;

export const PORTFOLIO_DATA: PortfolioContent = {
  about: {
    headline: "Software Engineer",
    facts:
      "Junjie Wu graduated from UNSW Sydney in December 2026 with a dual degree in Electrical Engineering and Computer Science. He was previously a Software Engineering Intern at Tencent, working on game engine tooling and graphics pipelines in C++, CUDA and Unreal Engine 5.",
    body: [
      "I am a software engineer and electrical engineer focused on C++, high-performance and real-time software, and FPGA and digital design: work where performance, memory and timing matter.",
      "My degree is a dual BEng (Hons) in Electrical Engineering and BSc in Computer Science from UNSW Sydney.",
    ],
    openTo:
      "Open to graduate software engineering or electrical engineering roles. Based in Sydney, Australia.",
  },
  projects: [
    {
      slug: "honours-thesis-privacy-preserving-speech-ai",
      title: "Honours Thesis: Privacy-Preserving Speech AI for MCI Detection",
      category: "software",
      date: "February 2026 - December 2026",
      started: "2026-02",
      updated: "2026-11-28",
      description:
        "Honours thesis on privacy-preserving MCI detection from speech, built around a 12.5 million parameter Conformer model trained from scratch in PyTorch.",
      metaDescription:
        "Junjie Wu's honours thesis: a 12.5M-parameter Conformer trained from scratch in PyTorch on an HPC cluster for privacy-preserving MCI detection from speech.",
      llmsLine:
        "honours thesis; 12.5M-parameter Conformer trained from scratch in PyTorch with distributed mixed-precision GPU training, for privacy-preserving MCI detection from speech",
      stack: ["PyTorch", "Conformer", "Transformers", "Self-Supervised Learning", "CUDA", "Speech Processing"],
      image: "/assets/honours-thesis/architecture.png",
    },
    {
      slug: "crm-portal",
      title: "Quality Battery Central: CRM Portal",
      category: "software",
      date: "August 2026",
      started: "2026-08",
      updated: "2026-11-28",
      organisation: "Quality Battery Central",
      organisationUrl: "https://www.qualitybatterycentral.com.au/",
      organisationLine: "For Quality Battery Central",
      image: "/assets/crm-portal/website_thumbnail.png",
      description:
        "Full-stack CRM and admin portal for Quality Battery Central, a solar, battery and EV charger installer on the NSW Central Coast.",
      details: [
        "The portal gives the company's staff one place to manage customer records, with Google OAuth sign-in.",
        "I also built an AI support agent for the company's public website. It answers customer questions and, when a query needs a person, takes the customer's details and forwards it to the support team so they can follow up.",
        "A Next.js frontend hosted on Vercel talks to a Flask REST API, with data stored in PostgreSQL. The backend runs in Docker on a cloud server, keeping deployments repeatable.",
      ],
      metaDescription:
        "A full-stack CRM and admin portal for Quality Battery Central, built with Next.js, a Flask REST API and PostgreSQL, with Google OAuth staff sign-in and Docker.",
      llmsLine: "for Quality Battery Central; full-stack CRM and admin portal plus a customer-facing AI support agent (Next.js, Flask, PostgreSQL, Docker, Google OAuth)",
      stack: ["Next.js", "React", "Flask", "Python", "PostgreSQL", "Docker"],
    },
    {
      slug: "agentic-ai-design-workflow",
      title: "Agentic AI Design Workflow",
      category: "software",
      date: "June 2026",
      started: "2026-06",
      updated: "2026-06-27",
      description:
        "An agentic workflow that connects Claude to the Figma API through the Model Context Protocol (MCP), generating and refining UI designs from plain English specifications.",
      details: [
        "The system orchestrates multistep tool calls, letting the model autonomously plan and execute design operations and iteratively refine the result. By exposing Figma as a set of MCP tools, the agent can reason about layout, create and edit frames, and converge on a polished design without manual intervention.",
      ],
      metaDescription:
        "An agentic AI workflow connecting Claude to the Figma API through the Model Context Protocol, planning multistep tool calls to generate and refine UI designs.",
      llmsLine: "LLM agent that drives the Figma API through the Model Context Protocol to generate and refine UI",
      stack: ["Claude", "MCP", "Figma API", "LLM Agents", "Tool Orchestration", "Prompt Engineering"],
    },
    {
      slug: "machine-learning-and-voltage-risk-modelling",
      title: "Ausgrid: Machine Learning and Voltage Risk Modelling",
      category: "software",
      date: "January 2026 - February 2026",
      started: "2026-01",
      updated: "2026-11-27",
      organisation: "Ausgrid",
      organisationLine: "At Ausgrid",
      role: "Electrical Engineering Intern",
      description:
        "An end-to-end Python machine learning pipeline, built with Ausgrid engineers, that models voltage constraint violations on low-voltage distribution networks under rising rooftop PV.",
      metaDescription:
        "A Python machine learning pipeline built at Ausgrid to model voltage constraint risk on low-voltage networks under rooftop solar, with counterfactual analysis.",
      llmsLine:
        "at Ausgrid (Electrical Engineering Intern); Python ML pipeline modelling voltage constraint risk on low-voltage networks under rooftop PV, with counterfactual intervention analysis",
      stack: ["Python", "Machine Learning", "Risk Modelling", "Power Systems"],
      githubUrl: "https://github.com/jay-junjiewu/voltage_planning_tool",
    },
    {
      slug: "virtual-memory-system-emulator-c",
      title: "Virtual Memory System Emulator C++",
      category: "software",
      date: "January 2026",
      started: "2026-01",
      updated: "2026-06-27",
      description:
        "vmsim is a C++ virtual memory system emulator that replays memory access traces through a configurable VM subsystem, enabling quantitative analysis of memory system design tradeoffs.",
      metaDescription:
        "vmsim, a C++ virtual memory emulator that replays memory traces through multilevel page tables, a set-associative TLB and FIFO, Clock, LRU and Aging eviction.",
      llmsLine: "C++ virtual memory emulator with multilevel page tables, set-associative TLB and four eviction policies",
      stack: ["C++", "Operating Systems", "Virtual Memory Systems"],
      githubUrl: "https://github.com/jay-junjiewu/vmsim",
    },
    {
      slug: "limit-order-book-matching-engine-in-c",
      title: "Limit Order Book Matching Engine in C++",
      category: "software",
      date: "January 2025",
      started: "2025-01",
      updated: "2026-06-27",
      description:
        "A low-latency limit order book and matching engine in modern C++, supporting price-time priority and order add, cancel, and modify operations.",
      details: [
        "Data structures on the hot path are optimised for deterministic matching in microseconds, with minimal allocation on the critical path. The engine models core exchange microstructure with an emphasis on predictable performance.",
      ],
      metaDescription:
        "A low-latency limit order book and matching engine in modern C++ with price-time priority, order add, cancel and modify, and minimal allocation on the hot path.",
      llmsLine: "low-latency matching engine with price-time priority",
      stack: ["C++", "Low-Latency Systems", "Data Structures"],
    },
    {
      slug: "personal-portfolio",
      title: "Personal Portfolio",
      category: "software",
      date: "December 2025",
      started: "2025-12",
      updated: "2026-11-27",
      description:
        "You are looking at this right now! This is my personal portfolio website, built with React and TypeScript to showcase my projects, skills, and experience in one place.",
      metaDescription:
        "How Junjie Wu built this portfolio: a React and TypeScript site with an interactive Babylon.js 3D island, prerendered pages, structured data and an AI guide.",
      llmsLine: "this website: React, TypeScript and a Babylon.js 3D island with prerendered document pages",
      stack: ["React", "TypeScript", "Babylon.js", "Responsive Design", "UI/UX", "Git"],
      githubUrl: "https://github.com/jay-junjiewu/portfolio-game",
    },
    {
      slug: "vinoos-website-freelance",
      title: "Vinoos Website (Freelance)",
      category: "software",
      date: "May 2025",
      started: "2025-05",
      updated: "2026-06-27",
      description:
        "A responsive product catalog website for a fish tank company, built with React and backed by Supabase for image storage.",
      metaDescription:
        "A responsive product catalogue site built freelance for a fish tank company using React and Supabase, with reusable components and high-quality product imagery.",
      llmsLine: "freelance React and Supabase product catalogue for a fish tank company",
      stack: ["React", "JavaScript", "Responsive Design", "UI/UX", "Git"],
      image: "/assets/vinoos/website_thumbnail.png",
      githubUrl: "https://github.com/jay-junjiewu/Vinoos",
    },
    {
      slug: "rankit-website-hackathon",
      title: "RankIt Website (Hackathon)",
      category: "software",
      date: "March 24th - 26th 2025",
      started: "2025-03",
      updated: "2026-06-27",
      description:
        "RankIt is a platform for UNSW students to rank categories related to university life, including courses, food, restaurants, toilets, and more. Built over a 48-hour hackathon in a team of two, I was responsible for the backend.",
      metaDescription:
        "RankIt, a hackathon platform for UNSW students to rank courses, food and campus spots, with an Express.js and Firebase backend and a React TypeScript frontend.",
      llmsLine: "hackathon platform for ranking UNSW courses and campus spots (Express.js, Firebase backend)",
      stack: ["React", "TypeScript", "Express.js", "NoSQL", "RESTful API"],
      image: "/assets/rankit/website_thumbnail.png",
      githubUrl: "https://github.com/FiveRankers/RankIt",
    },
    {
      slug: "audio-equaliser-in-c",
      title: "Audio Equaliser in C++",
      category: "software",
      date: "December 2024 - February 2025",
      started: "2024-12",
      updated: "2026-06-27",
      description:
        "A 5-band audio equaliser written using only the C++ STL, letting users adjust sub-bass, bass, midrange, upper midrange and treble in .wav files.",
      metaDescription:
        "A 5-band audio equaliser in C++ that applies per-band gains from sub-bass to treble, handles stereo audio, adds dynamic range compression and saves the result.",
      llmsLine: "5-band audio equaliser in C++ with stereo processing and dynamic range compression",
      stack: ["C++", "MATLAB", "Digital Signal Processing", "Real-Time Processing"],
      image: "/assets/audio-equaliser/time.png",
    },
    {
      slug: "atomcraft-pulsed-power-control-board",
      title: "AtomCraft: Pulsed Supercapacitor Switching and Control",
      category: "electrical",
      date: "February 2026 - November 2026",
      started: "2026-02",
      updated: "2026-11-28",
      organisation: "AtomCraft",
      organisationLine: "For AtomCraft",
      role: "Electrical Engineer",
      description:
        "Designed and built the switching and control for a supercapacitor pulsed power system that generates plasma for nuclear fusion research at AtomCraft.",
      details: [
        "I performed MOSFET switching analysis and high-voltage hardware characterisation to tune discharge timing and reliability under extreme transient conditions, and validated high-voltage circuit topologies that balance energy storage, switching speed and safety.",
      ],
      metaDescription:
        "Switching and control for AtomCraft's supercapacitor pulsed power system, which generates plasma for nuclear fusion research, with MOSFET switching analysis.",
      llmsLine:
        "for AtomCraft (Electrical Engineer); switching and control for a supercapacitor pulsed power system generating plasma for nuclear fusion research, with MOSFET switching analysis and high-voltage design",
      stack: ["Power Electronics", "High Voltage Design", "PCB Design"],
    },
    {
      slug: "fpga-based-5-stage-pipelined-processor",
      title: "FPGA-Based 5-Stage Pipelined Processor",
      category: "electrical", 
      date: "May 2025 - August 2025",
      started: "2025-05",
      updated: "2026-06-27",
      description:
        "A 5-stage pipelined MIPS processor built in Verilog HDL with the Xilinx Vivado Design Suite and deployed on an FPGA.",
      details: [
        "The work covered RTL design, behavioural simulation, synthesis, place and route, and FPGA deployment. The design was optimised for throughput and to minimise pipeline hazards, with functionality verified through comprehensive testbenches and timing verification.",
      ],
      metaDescription:
        "A 5-stage pipelined MIPS processor in Verilog, taken from RTL design through simulation, synthesis and place-and-route to FPGA deployment with Vivado.",
      llmsLine: "5-stage pipelined MIPS CPU in Verilog, from RTL to FPGA deployment in Xilinx Vivado",
      stack: ["Verilog", "Xilinx Vivado", "FPGA", "RTL Design"],
    },
    {
      slug: "guitar-power-amplifier",
      title: "Guitar Power Amplifier",
      category: "electrical",
      date: "September 2024 - December 2024",
      started: "2024-09",
      updated: "2026-06-27",
      description:
        "A Class G guitar power amplifier that drives loudspeakers with clear audio while staying efficient.",
      metaDescription:
        "A multistage guitar power amplifier designed in KiCad, with separate gain and power stages that drive loudspeakers efficiently while keeping distortion low.",
      llmsLine: "multistage guitar power amplifier PCB designed in KiCad",
      stack: ["Power Electronics", "PCB Design", "KiCad"],
      image: "/assets/guitar-power-amplifier/3D1.png",
    },
    {
      slug: "sunswift-racing-mppt-project",
      title: "Sunswift Racing: MPPT Project",
      category: "electrical",
      date: "September 2023 - August 2024",
      started: "2023-09",
      updated: "2026-11-27",
      organisation: "Sunswift Racing",
      organisationLine: "For Sunswift Racing (UNSW solar car team)",
      role: "Embedded Firmware Engineer (Sep 2023 to Jan 2024), then Project Lead, Energy Systems (Jan 2024 to Aug 2024)",
      description:
        "Designed a 1 kW Maximum Power Point Tracking (MPPT) converter PCB for the Sunswift Racing solar car, and later led the team's Energy Systems department.",
      metaDescription:
        "A 1 kW MPPT DC-DC converter PCB with embedded firmware and CAN integration for Sunswift Racing, plus leadership of the 15-engineer Energy Systems team.",
      llmsLine:
        "for Sunswift Racing, the UNSW solar car team (Embedded Firmware Engineer, then Project Lead, Energy Systems); 1 kW MPPT DC-DC converter PCB with firmware and CAN integration",
      stack: ["Power Electronics", "PCB Design", "Embedded C++"],
      image: "/assets/sunswift/SR7.jpg",
    },
    {
      slug: "ambient-sound-monitor-system",
      title: "Ambient Sound Monitor System",
      category: "electrical",
      date: "May 2024 - August 2024",
      started: "2024-05",
      updated: "2026-06-27",
      description:
        "Xylyrnth is an ambient sound monitoring system for smartwatches that detects key sounds in real time and alerts users through haptic and visual feedback.",
      metaDescription:
        "An embedded ambient sound monitor in C on FreeRTOS that detects key sounds with real-time signal processing and alerts users through haptic and visual cues.",
      llmsLine: "embedded sound monitor in C on FreeRTOS with real-time DSP and haptic alerts",
      stack: ["C", "FreeRTOS", "Digital Signal Processing", "Embedded Firmware"],
      image: "/assets/ambient-sound-monitor-system/3d.png",
    },
  ],
  skills: [
    { category: "Languages", items: ["C++", "C", "Python", "CUDA", "TypeScript / JavaScript"] },
    { category: "Systems & Performance", items: ["Multithreading", "GPU Programming", "Linux"] },
    { category: "Game Engine & Graphics", items: ["Unreal Engine 5", "Graphics Pipelines", "Graphics Algorithms"] },
    { category: "Machine Learning", items: ["PyTorch", "Transformers", "Scikit-learn"] },
    { category: "Web & Backend", items: ["React", "Next.js", "Node.js", "Flask", "PostgreSQL", "Docker"] },
    {
      category: "FPGA & Digital Design",
      items: [
        "Verilog", "FPGA / RTL Design", "Digital Logic Design", "DSP",
      ],
    },
    { category: "Electrical & Embedded", items: ["FreeRTOS", "Power Electronics", "Signal Processing", "Analog Electronics"] },
    { category: "Tools", items: ["Git", "Xilinx Vivado", "Altium Designer", "KiCad", "MATLAB"] },
  ],
  experience: [
    {
      company: "Tencent",
      companyUrl: "https://www.tencent.com/",
      role: "Software Engineering Intern",
      period: "June 2026 - December 2026",
      location: "Sydney",
      highlights: [
        "Worked on game engine tooling, graphics pipelines and algorithms, and developer infrastructure using C++, CUDA, GPU programming, and Unreal Engine 5.",
      ],
    },
    {
      company: "UNSW School of Electrical Engineering and Telecommunications",
      companyUrl: "https://www.unsw.edu.au/engineering/our-schools/electrical-engineering-telecommunications",
      role: "Lab Demonstrator",
      period: "January 2024 - May 2026",
      location: "Sydney",
      highlights: [
        "Demonstrated and tutored labs for ELEC1111, ELEC2133, ELEC2134, ELEC3106, ELEC3117 and ELEC4123, across a cohort of 700+ students.",
      ],
    },
  ],
  contact: {
    email: "jaywu0046@gmail.com",
    location: "Sydney, Australia",
    links: [
      { label: "GitHub", url: "https://github.com/jay-junjiewu" },
      { label: "LinkedIn", url: "https://www.linkedin.com/in/junjiewujay/" },
    ],
  },
};

export const PANEL_TITLES: Record<BuildingKey, string> = {
  about: "About",
  projects: "Projects",
  experience: "Experience",
  skills: "Skills",
  contact: "Contact",
};

export const findProject = (slug: string | undefined) =>
  slug ? PORTFOLIO_DATA.projects.find((project) => project.slug === slug) : undefined;

/** 2 to 3 related projects: same category first, ordered by shared tags. */
export const relatedProjects = (project: Project, count = 3): Project[] => {
  const tags = new Set(project.stack.map((tag) => tag.toLowerCase()));
  return PORTFOLIO_DATA.projects
    .filter((candidate) => candidate.slug !== project.slug)
    .map((candidate, index) => ({
      candidate,
      index,
      score:
        (candidate.category === project.category ? 10 : 0) +
        candidate.stack.filter((tag) => tags.has(tag.toLowerCase())).length,
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, count)
    .map(({ candidate }) => candidate);
};
