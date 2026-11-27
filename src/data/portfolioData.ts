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
  /** Summary shown on cards, at the top of the project page, and in llms.txt. */
  description: string;
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
    headline: "C++ Software Engineer and Electrical Engineer",
    facts:
      "Junjie Wu graduated from UNSW Sydney in December 2026 with a dual degree in Electrical Engineering and Computer Science. He was a Software Engineering Intern at Tencent, working on game engine tooling and graphics pipelines in C++, CUDA and Unreal Engine 5.",
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
      title: "Honours Thesis: Privacy-Preserving Speech AI for Dementia Detection",
      category: "software",
      date: "February 2026 - December 2026",
      started: "2026-02",
      updated: "2026-11-27",
      description:
        "Designed and trained a 12.5 million parameter Conformer model from scratch in PyTorch, combining convolution with multi-head self-attention to model local and long-range structure in speech. Ran distributed, mixed-precision GPU training on an HPC cluster, fine-tuned pretrained transformer and self-supervised speech models for a small clinical dataset, and validated design choices with ablation studies against state-of-the-art baselines.",
      metaDescription:
        "Junjie Wu's honours thesis: a 12.5M-parameter Conformer trained from scratch in PyTorch on an HPC cluster for privacy-preserving dementia detection from speech.",
      llmsLine:
        "honours thesis; 12.5M-parameter Conformer trained from scratch in PyTorch with distributed mixed-precision GPU training, for privacy-preserving dementia detection from speech",
      stack: ["PyTorch", "Conformer", "Transformers", "Self-Supervised Learning", "HPC", "CUDA", "Speech Processing"],
    },
    {
      slug: "crm-portal",
      title: "CRM Portal",
      category: "software",
      date: "August 2026",
      started: "2026-08",
      updated: "2026-11-28",
      description:
        "Full-stack CRM and admin portal for a Sydney-based company. Staff sign in with Google OAuth, a Next.js frontend on Vercel talks to a Flask REST API, and data lives in PostgreSQL. The backend runs in Docker on a cloud server.",
      metaDescription:
        "A full-stack CRM and admin portal for a Sydney-based company, built with Next.js, a Flask REST API and PostgreSQL, with Google OAuth staff sign-in and Docker.",
      llmsLine: "full-stack CRM and admin portal (Next.js, Flask, PostgreSQL, Docker, Google OAuth)",
      stack: ["Next.js", "React", "Flask", "Python", "Supabase", "PostgreSQL", "Docker", "Google OAuth", "Vercel"],
    },
    {
      slug: "agentic-ai-design-workflow",
      title: "Agentic AI Design Workflow",
      category: "software",
      date: "June 2026",
      started: "2026-06",
      updated: "2026-06-27",
      description:
        "Built an agentic workflow that integrates a large language model (Claude) with the Figma API through the Model Context Protocol (MCP). The system orchestrates multi-step tool calls, letting the model autonomously plan and execute design operations to generate and iteratively refine UI directly from natural-language specifications. By exposing Figma as a set of MCP tools, the agent can reason about layout, create and edit frames, and converge on a polished design without manual intervention.",
      metaDescription:
        "An agentic AI workflow connecting Claude to the Figma API through the Model Context Protocol, planning multi-step tool calls to generate and refine UI designs.",
      llmsLine: "LLM agent that drives the Figma API through the Model Context Protocol to generate and refine UI",
      stack: ["Claude", "MCP (Model Context Protocol)", "Figma API", "LLM Agents", "Tool Orchestration", "Prompt Engineering"],
    },
    {
      slug: "machine-learning-and-voltage-risk-modelling",
      title: "Machine Learning and Voltage Risk Modelling",
      category: "software",
      date: "January 2026 - February 2026",
      started: "2026-01",
      updated: "2026-11-27",
      organisation: "Ausgrid",
      organisationLine: "At Ausgrid",
      role: "Electrical Engineering Intern",
      description:
        "Built an end-to-end Python machine learning pipeline modelling the probability and duration of voltage constraint violations on low-voltage distribution networks under rising rooftop PV. Ran counterfactual evaluations of intervention strategies as reductions in predicted risk-minutes, validated against observed outcomes, and produced confidence-bounded risk metrics for asset prioritisation, working with Ausgrid engineers.",
      metaDescription:
        "A Python machine learning pipeline built at Ausgrid to model voltage constraint risk on low-voltage networks under rooftop solar, with counterfactual analysis.",
      llmsLine:
        "at Ausgrid (Electrical Engineering Intern); Python ML pipeline modelling voltage constraint risk on low-voltage networks under rooftop PV, with counterfactual intervention analysis",
      stack: ["Python", "Machine Learning", "Time-Series", "Risk Modelling", "Power Systems"],
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
        "vmsim is a C++ virtual memory system emulator that replays memory-access traces through a configurable VM subsystem. It simulates a multi-level page table, a set-associative TLB with optional ASID support, page faults, frame allocation, and multiple eviction policies (FIFO, Clock, LRU, Aging). The simulator includes optional swap-backed paging, a detailed cycle-based cost model, and AMAT calculation, enabling quantitative analysis of memory-system design tradeoffs. It outputs detailed performance statistics in both human-readable and JSON formats for further evaluation.",
      metaDescription:
        "vmsim, a C++ virtual memory emulator that replays memory traces through multi-level page tables, a set-associative TLB and FIFO, Clock, LRU and Aging eviction.",
      llmsLine: "C++ virtual memory emulator with multi-level page tables, set-associative TLB and four eviction policies",
      stack: ["C++", "Operating Systems", "Virtual Memory Systems", "Page Tables", "TLB Simulation"],
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
        "Built a low-latency limit order book and matching engine in modern C++ supporting price-time priority and order add, cancel, and modify operations. Optimised hot-path data structures for deterministic, microsecond-scale matching, modelling core exchange microstructure with an emphasis on predictable performance and minimal allocation on the critical path.",
      metaDescription:
        "A low-latency limit order book and matching engine in modern C++ with price-time priority, order add, cancel and modify, and minimal allocation on the hot path.",
      llmsLine: "low-latency matching engine with price-time priority",
      stack: ["C++", "Low-Latency Systems", "Data Structures", "Market Microstructure", "Performance Optimisation"],
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
      stack: ["React", "TypeScript", "Babylon.js", "Responsive Design", "Component-Based Architecture", "UI/UX Principles", "Git"],
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
        "I built a responsive product catalog website for a fish tank company using React and modern JavaScript practices, focusing on component-based architecture and reusable UI patterns. The site allows visitors to easily browse and view the company's products with an emphasis on high-quality visual presentation. For the database, I integrated Supabase for backend services to handle image storage.",
      metaDescription:
        "A responsive product catalogue site built freelance for a fish tank company using React and Supabase, with reusable components and high-quality product imagery.",
      llmsLine: "freelance React and Supabase product catalogue for a fish tank company",
      stack: ["React", "JavaScript", "Supabase", "Responsive Design", "Component-Based Architecture", "UI/UX Principles", "Git"],
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
        "As a Hackathon project, I worked on the backend of RankIt website in a team of two (my teammate focused on the frontend). RankIt is a platform built for UNSW students to rank a variety of categories related to UNSW, including courses, food, restaurants, toilets, and more. The backend is built using ExpressJS in the Node.js environment, utilizing JavaScript. Firebase serves as the NoSQL database for real-time data storage, and Supabase is used for image storage. The frontend was developed with React and TypeScript, utilizing Node.js for the development environment and build tools.",
      metaDescription:
        "RankIt, a hackathon platform for UNSW students to rank courses, food and campus spots, with an Express.js and Firebase backend and a React TypeScript frontend.",
      llmsLine: "hackathon platform for ranking UNSW courses and campus spots (Express.js, Firebase backend)",
      stack: ["React", "JavaScript", "TypeScript", "Express.js", "Firebase", "Supabase", "NoSQL Database", "RESTful API"],
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
        "I built a 5-band audio equaliser using C++ STL. The equaliser reads in an audio file and allows users to apply various gains to 5 frequency bands (sub-bass, bass, midrange, upper midrange, treble). It can also process stereo audio, apply dynamic range compression, and save the result into an audio file.",
      metaDescription:
        "A 5-band audio equaliser in C++ that applies per-band gains from sub-bass to treble, handles stereo audio, adds dynamic range compression and saves the result.",
      llmsLine: "5-band audio equaliser in C++ with stereo processing and dynamic range compression",
      stack: ["C++", "MATLAB", "Digital Signal Processing", "Real-Time Processing"],
      image: "/assets/audio-equaliser/time.png",
    },
    {
      slug: "atomcraft-pulsed-power-control-board",
      title: "AtomCraft: Pulsed-Power Switching and Control Board",
      category: "electrical",
      date: "February 2026 - November 2026",
      started: "2026-02",
      updated: "2026-11-27",
      organisation: "AtomCraft",
      organisationLine: "For AtomCraft",
      role: "Electrical Engineer",
      description:
        "Designed and built the switching and control board for a supercapacitor-based pulsed-power system at AtomCraft. Performed MOSFET switching analysis and high-voltage hardware characterisation to tune discharge timing and reliability under extreme transient conditions, and validated high-voltage circuit topologies balancing energy storage, switching speed and safety.",
      metaDescription:
        "The switching and control board for AtomCraft's supercapacitor-based pulsed-power system, with MOSFET switching analysis and high-voltage circuit validation.",
      llmsLine:
        "for AtomCraft (Electrical Engineer); switching and control board for a supercapacitor-based pulsed-power system, with MOSFET switching analysis and high-voltage design",
      stack: ["Pulsed Power", "Power Electronics", "MOSFET Switching", "High-Voltage Design", "PCB Design"],
    },
    {
      slug: "fpga-based-5-stage-pipelined-processor",
      title: "FPGA-Based 5-Stage Pipelined Processor",
      category: "electrical",
      date: "May 2025 - August 2025",
      started: "2025-05",
      updated: "2026-06-27",
      description:
        "Built a MIPS-based 5-stage pipelined processor using Verilog HDL within the Xilinx Vivado Design Suite. Performed RTL design, behavioural simulation, synthesis, place-and-route, and deployment on FPGA. Optimised for throughput, minimised pipeline hazards, and verified functionality through comprehensive testbenches and timing-driven verification.",
      metaDescription:
        "A MIPS-based 5-stage pipelined processor in Verilog, taken from RTL design through simulation, synthesis and place-and-route to FPGA deployment with Vivado.",
      llmsLine: "MIPS-based 5-stage pipelined CPU in Verilog, from RTL to FPGA deployment in Xilinx Vivado",
      stack: ["Verilog HDL", "Xilinx Vivado", "FPGA", "RTL Design", "MIPS Architecture", "Digital Design"],
    },
    {
      slug: "guitar-power-amplifier",
      title: "Guitar Power Amplifier",
      category: "electrical",
      date: "September 2024 - December 2024",
      started: "2024-09",
      updated: "2026-06-27",
      description:
        "A guitar power amplifier for loudspeakers that delivers clear, high-quality audio with optimal efficiency. It takes weak stereo signals from audio jacks or microphones, amplifies them, and preserves signal integrity while minimizing total harmonic distortion (THD). The design features a multi-stage cascaded approach with separate stages for signal gain and power output, offering precise control over both audio clarity and efficiency.",
      metaDescription:
        "A multi-stage guitar power amplifier designed in KiCad, with separate gain and power stages that drive loudspeakers efficiently while keeping distortion low.",
      llmsLine: "multi-stage guitar power amplifier PCB designed in KiCad",
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
        "Designed a 1 kW DC-DC converter PCB delivering power from 30 V photovoltaic panels to the battery, with firmware-level Maximum Power Point Tracking and CAN integration with the energy management system. Later led the Energy Systems team for the Sunswift Racing team that won the 2023 Bridgestone World Solar Challenge and set a Guinness World Record.",
      metaDescription:
        "A 1 kW MPPT DC-DC converter PCB with embedded firmware and CAN integration for Sunswift Racing, plus leadership of the 15-engineer Energy Systems team.",
      llmsLine:
        "for Sunswift Racing, the UNSW solar car team (Embedded Firmware Engineer, then Project Lead, Energy Systems); 1 kW MPPT DC-DC converter PCB with firmware and CAN integration",
      stack: ["Power Electronics", "MPPT", "PCB Design", "Embedded C++", "CAN", "Technical Leadership"],
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
        "This project is designed for users who may struggle to stay aware of their surroundings or frequently operate in noisy environments. It leverages advanced real-time processing to detect key sounds and deliver alerts through haptic and visual feedback, helping users stay aware in such environments.",
      metaDescription:
        "An embedded ambient sound monitor in C on FreeRTOS that detects key sounds with real-time signal processing and alerts users through haptic and visual cues.",
      llmsLine: "embedded sound monitor in C on FreeRTOS with real-time DSP and haptic alerts",
      stack: ["C", "FreeRTOS", "Digital Signal Processing", "Embedded Firmware"],
      image: "/assets/ambient-sound-monitor-system/3d.png",
    },
  ],
  skills: [
    { category: "Languages", items: ["C++", "C", "Python", "CUDA", "TypeScript / JavaScript", "SQL"] },
    { category: "Systems & Performance", items: ["Multithreading", "GPU Programming", "Linux"] },
    { category: "Game Engine & Graphics", items: ["Unreal Engine 5", "Graphics Pipelines", "Graphics Algorithms"] },
    { category: "Machine Learning", items: ["PyTorch", "Transformers", "Scikit-learn"] },
    { category: "Web & Backend", items: ["React", "Next.js", "Node.js", "Flask", "PostgreSQL", "Docker"] },
    {
      category: "FPGA & Digital Design",
      items: [
        "Verilog", "FPGA / RTL Design", "Digital Logic Design", "Testbench Verification", "DSP",
      ],
    },
    { category: "Electrical & Embedded", items: ["FreeRTOS", "CAN", "Power Electronics", "Signal Processing", "Analog Electronics"] },
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
