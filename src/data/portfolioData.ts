import type { BuildingKey } from "./cityLayout";

export type ProjectCategory = "software" | "electrical";

export type Project = {
  title: string;
  description: string;
  stack: string[];
  category: ProjectCategory;
  date: string;
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
  highlights: string[];
  links?: ExperienceLink[];
};

export type PortfolioContent = {
  about: {
    headline: string;
    body: string[];
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

export const projectSlug = (title: string) =>
  title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const PORTFOLIO_DATA: PortfolioContent = {
  about: {
    headline: "Software Engineering Intern @ Tencent | Computer Science & Electrical Engineering @ UNSW",
    body: [
      "Software engineer focused on low-level, high-performance C++ and systems programming. Final year Computer Science and Electrical Engineering student at UNSW. I work across C++, firmware, hardware, FPGA and RTL design, and real-time software where performance, memory, and timing matter. \n\nCurrently interning at Tencent, working with C++ and Unreal Engine.",
    ],
  },
  projects: [
    {
      title: "Undergraduate Thesis: Transformer-Based Speech Anonymization",
      category: "software",
      date: "Present",
      description:
        "Designing and implementing deep learning models for speech anonymization using transformer architectures in PyTorch. The system targets speaker identity concealment while preserving linguistic content and naturalness, with applications in privacy-preserving speech processing.",
      stack: [
        "Python", "PyTorch", "Transformers", "Deep Learning", "Speech Processing", "Neural Networks",
      ],
    },
    {
      title: "CRM Portal",
      category: "software",
      date: "Present",
      description:
        "Full-stack CRM and admin portal for a Sydney-based company, with a public contact form and a staff-only dashboard, containerised using Docker and docker-compose. Google OAuth with a server-enforced staff allowlist controls access, and Next.js middleware and httpOnly session cookies guard admin routes. A Flask REST API serves a normalised PostgreSQL schema, with migrations and seed data managed via the Supabase CLI. The Next.js frontend deploys to Vercel and the Dockerised Flask backend runs on a cloud droplet.",
      stack: [
        "Next.js", "React", "Flask", "Python", "Supabase", "PostgreSQL", "Docker", "Google OAuth", "Vercel",
      ],
    },
     {
      title: "Agentic AI Design Workflow",
      category: "software",
      date: "June 2026",
      description:
        "Built an agentic workflow that integrates a large language model (Claude) with the Figma API through the Model Context Protocol (MCP). The system orchestrates multi-step tool calls, letting the model autonomously plan and execute design operations to generate and iteratively refine UI directly from natural-language specifications. By exposing Figma as a set of MCP tools, the agent can reason about layout, create and edit frames, and converge on a polished design without manual intervention.",
      stack: [
        "Claude", "MCP (Model Context Protocol)", "Figma API", "LLM Agents", "Tool Orchestration", "Prompt Engineering",
      ],
    },
    {
      title: "Machine Learning and Voltage Risk Modelling",
      category: "software",
      date: "January 2026",
      description:
        "Developed and validated predictive models using real-world operational datasets, applying feature engineering and robustness testing to evaluate intervention trade-offs through structured counterfactual analysis.",
      stack: [
        "Python", "Machine Learning", "Feature Engineering", "Counterfactual Analysis", "Data Analysis", "Pandas",
      ],
      githubUrl: "https://github.com/jay-junjiewu/voltage_planning_tool",
    },
    {
      title: "Virtual Memory System Emulator C++",
      category: "software",
      date: "January 2026",
      description:
        "vmsim is a C++ virtual memory system emulator that replays memory-access traces through a configurable VM subsystem. It simulates a multi-level page table, a set-associative TLB with optional ASID support, page faults, frame allocation, and multiple eviction policies (FIFO, Clock, LRU, Aging). The simulator includes optional swap-backed paging, a detailed cycle-based cost model, and AMAT calculation, enabling quantitative analysis of memory-system design tradeoffs. It outputs detailed performance statistics in both human-readable and JSON formats for further evaluation.",
      stack: [
        "C++",
        "Operating Systems",
        "Virtual Memory Systems",
        "Page Tables",
        "TLB Simulation",
      ],
      githubUrl: "https://github.com/jay-junjiewu/vmsim"
    },
    {
      title: "Limit Order Book Matching Engine in C++",
      category: "software",
      date: "January 2025",
      description:
        "Built a low-latency limit order book and matching engine in modern C++ supporting price-time priority and order add, cancel, and modify operations. Optimised hot-path data structures for deterministic, microsecond-scale matching, modelling core exchange microstructure with an emphasis on predictable performance and minimal allocation on the critical path.",
      stack: [
        "C++", "Low-Latency Systems", "Data Structures", "Market Microstructure", "Performance Optimisation",
      ],
    },
    {
      title: "Personal Portfolio",
      category: "software",
      date: "December 2025",
      description:
        "You are looking at this right now! This is my personal portfolio website, built with React and modern JavaScript to showcase my projects, skills, and experience in one centralized platform. The site focuses on clean UI, responsive layouts, and maintainable component-based architecture. It also serves as a scalable foundation for future enhancements, including backend integration, APIs, and database-driven content.",
      stack: [
        "React",
        "JavaScript",
        "CSS",
        "Responsive Design",
        "Component-Based Architecture",
        "UI/UX Principles",
        "Git"
      ],
      githubUrl: "https://github.com/jay-junjiewu/portfolio-game"
    },
    {
      title: "Vinoos Website (Freelance)",
      category: "software",
      date: "May 2025",
      description:
        "I built a responsive product catalog website for a fish tank company using React and modern JavaScript practices, focusing on component-based architecture and reusable UI patterns. The site allows visitors to easily browse and view the company's products with an emphasis on high-quality visual presentation. For the database, I integrated Supabase for backend services to handle image storage.",
      stack: [
        "React", "JavaScript", "Supabase", "Responsive Design", "Component-Based Architecture",
        "UI/UX Principles", "Git"
      ],
      image: "/assets/vinoos/website_thumbnail.png",
      githubUrl: "https://github.com/jay-junjiewu/Vinoos"
    },
    {
      title: "RankIt Website (Hackathon)",
      category: "software",
      date: "March 24th - 26th 2025",
      description:
        "As a Hackathon project, I worked on the backend of RankIt website in a team of two (my teammate focused on the frontend). RankIt is a platform built for UNSW students to rank a variety of categories related to UNSW, including courses, food, restaurants, toilets, and more. The backend is built using ExpressJS in the Node.js environment, utilizing JavaScript. Firebase serves as the NoSQL database for real-time data storage, and Supabase is used for image storage. The frontend was developed with React and TypeScript, utilizing Node.js for the development environment and build tools.",
      stack: [
        "React", "JavaScript", "TypeScript", "Express.js", "Firebase", "Supabase", "NoSQL Database", "RESTful API"
      ],
      image: "/assets/rankit/website_thumbnail.png",
      githubUrl: "https://github.com/FiveRankers/RankIt"
    },
    {
      title: "Audio Equaliser in C++",
      category: "software",
      date: "December 2024 - February 2025",
      description:
        "I built a 5-band audio equaliser using C++ STL. The equaliser reads in an audio file and allows users to apply various gains to 5 frequency bands (sub-bass, bass, midrange, upper midrange, treble). It can also process stereo audio, apply dynamic range compression, and save the result into an audio file.",
      stack: [
        "C++", "MATLAB", "Digital Signal Processing", "Real-Time Processing"
      ],
      image: "/assets/audio-equaliser/time.png",
    },
    {
      title: "FPGA-Based 5-Stage Pipelined Processor",
      category: "electrical",
      date: "May 2025 - August 2025",
      description:
        "Built a MIPS-based 5-stage pipelined processor using Verilog HDL within the Xilinx Vivado Design Suite. Performed RTL design, behavioural simulation, synthesis, place-and-route, and deployment on FPGA. Optimised for throughput, minimised pipeline hazards, and verified functionality through comprehensive testbenches and timing-driven verification.",
      stack: ["Verilog HDL", "Xilinx Vivado", "FPGA", "RTL Design", "MIPS Architecture", "Digital Design"],
    },
    {
      title: "Guitar Power Amplifier",
      category: "electrical",
      date: "September 2024 - December 2024",
      description:
        "A guitar power amplifier for loudspeakers that delivers clear, high-quality audio with optimal efficiency. It takes weak stereo signals from audio jacks or microphones, amplifies them, and preserves signal integrity while minimizing total harmonic distortion (THD). The design features a multi-stage cascaded approach with separate stages for signal gain and power output, offering precise control over both audio clarity and efficiency.",
      stack: ["Power Electronics", "PCB Design", "KiCad"],
      image: "/assets/guitar-power-amplifier/3D1.png",
    },
    {
      title: "Sunswift Racing: MPPT Project",
      category: "electrical",
      date: "September 2023 - December 2024",
      description:
        "I worked on an electric vehicle that set a Guinness World Record and won the 2023 Bridgestone World Solar Challenge. As the project lead for the Energy Systems Department, I was in charge of the MPPT (Maximum Power Point Tracking) project.",
      stack: ["Power Distribution", "Power Electronics", "Altium", "Team Leadership", "Project Management"],
      image: "/assets/sunswift/SR7.jpg",
    },
    {
      title: "Ambient Sound Monitor System",
      category: "electrical",
      date: "May 2024 - August 2024",
      description:
        "This project is designed for users who may struggle to stay aware of their surroundings or frequently operate in noisy environments. It leverages advanced real-time processing to detect key sounds and deliver alerts through haptic and visual feedback, helping users stay aware in such environments.",
      stack: ["C", "FreeRTOS", "Digital Signal Processing", "Embedded Firmware"],
      image: "/assets/ambient-sound-monitor-system/3d.png",
    },
  ],
  skills: [
    {
      category: "Programming Languages",
      items: ["Python", "C++", "C", "JavaScript", "SQL", "Verilog HDL"],
    },
    {
      category: "Machine Learning",
      items: ["PyTorch", "Transformers", "Deep Learning", "Feature Engineering", "Counterfactual Analysis", "Pandas", "Scikit-learn"],
    },
    {
      category: "Software Engineering",
      items: ["React.js", "Node.js", "Express.js", "RESTful APIs", "HTML5", "CSS3", "PostgreSQL"],
    },
    {
      category: "Electrical & Embedded Systems",
      items: [
        "FPGA Design",
        "RTL Design",
        "Power Electronics",
        "Signal Processing",
        "Analog & Digital Electronics",
        "Embedded C",
      ],
    },
    {
      category: "Tools & Platforms",
      items: ["Altium Designer", "KiCad", "Xilinx Vivado", "MATLAB", "Simulink", "Git"],
    },
  ],
  experience: [
    {
      company: "Tencent",
      companyUrl: "https://www.tencent.com/",
      role: "Software Engineering Intern",
      period: "June 2026 - Present",
      highlights: [
        "Working with C++, Python, Unreal Engine 5, C#, .NET, Perforce, REST API design, multithreading, caching, and Git."
      ],
    },
    {
      company: "AtomCraft",
      companyUrl: "https://www.atomcraft.com.au/",
      role: "Electrical Engineer",
      period: "February 2026 - Present",
      highlights: [
        "Pulsed power systems research for plasma generation with supercapacitors."
      ],
    },
    {
      company: "Ausgrid",
      companyUrl: "https://www.ausgrid.com.au/",
      role: "Electrical Engineering Intern",
      period: "January 2026 - February 2026",
      highlights: [
        "Worked on machine learning and data analysis for an electrical network planning project in collaboration with UNSW, modelling voltage risk from rooftop solar."
      ],
    },
    {
      company: "UNSW",
      companyUrl: "https://www.unsw.edu.au/engineering/our-schools/electrical-engineering-telecommunications",
      role: "Lab Demonstrator",
      period: "January 2024 - May 2026",
      highlights: [
        "Coordinated, assisted, and assessed students in UNSW electrical engineering labs.",
      ],
    },
    {
      company: "Sunswift Racing",
      companyUrl: "https://www.sunswift.com",
      role: "Lead Electrical Engineer",
      period: "September 2023 - December 2024",
      highlights: [
      "Built embedded firmware in low-level C++ and designed PCBs, and led the electrical team for Sunswift's world-record solar EV."
      ],
      links: [
        {
          title: "EV record breakers! Sunswift 7 goes 1000km on a single charge in world's best time",
          url: "https://www.unsw.edu.au/newsroom/news/2022/10/ev-record-breakers-sunswift-7-goes-1000km-on-a-single-charge-in-worlds-best-time",
          image: "/assets/sunswift/SR7_road.jpg",
          source: "Sunswift"
        }
      ],
    },
  ],
  contact: {
    email: "jaywu0046@gmail.com",
    location: "Sydney, Australia",
    links: [
      { label: "GitHub", url: "https://github.com/jay-junjiewu" },
      { label: "LinkedIn", url: "https://linkedin.com/in/junjiewujay/" },
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
