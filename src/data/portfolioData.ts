import type { BuildingKey } from "./cityLayout";

export type ProjectCategory = "software" | "electrical";

export type Project = {
  title: string;
  description: string;
  stack: string[];
  category: ProjectCategory;
  date: string;
  image?: string;
};

export type ExperienceItem = {
  company: string;
  role: string;
  period: string;
  highlights: string[];
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
    headline: "Computer Science & Electrical Engineering Student Focused on Software Engineering",
    body: [
      "Hello there! Welcome to my website :) \n\nI am Junjie Wu, a penultimate Computer Science and Electrical Engineering student at UNSW with a passion for building things and making things work. \n\nMy academic and project work focuses heavily on software development, including building modern web applications using React, developing high-performance and embedded software in C++, and integrating software with hardware in low-level embedded and real-time systems. Alongside this, I've worked on engineering applications in areas such as electric vehicles, power, and audio systems, where software plays a central role in system performance and reliability. \n\nFeel free to reach out for a chat. Let's connect and create a meaningful impact together!",
    ],
  },
  projects: [
    {
      title: "Aurora Transit",
      category: "software",
      date: "May 2024",
      description:
        "Transit planner that lets riders simulate future routes in a stylized 3D city using Babylon.js and GraphQL.",
      stack: ["Babylon.js", "React", "GraphQL", "Web Audio API"],
      image: "/vite.svg",
    },
    {
      title: "Biolume AR Guide",
      category: "software",
      date: "February 2024",
      description:
        "Mobile web app blending AR portals with live environmental data for science museums.",
      stack: ["React Native Web", "Three.js", "Expo"],
      image: "/vite.svg",
    },
    {
      title: "Field Notes OS",
      category: "software",
      date: "October 2023",
      description:
        "Offline-first research companion for humanitarian field teams that syncs via WebRTC mesh networks.",
      stack: ["TypeScript", "IndexedDB", "WebRTC", "PWA"],
      image: "/vite.svg",
    },
    {
      title: "Canvas Beats",
      category: "software",
      date: "June 2023",
      description:
        "Modular audio workstation in the browser with drag-to-patch synth nodes and multiplayer editing.",
      stack: ["React", "Tone.js", "Colyseus"],
      image: "/vite.svg",
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
      items: ["C++", "C", "JavaScript", "Python", "SQL", "Verilog HDL"],
    },
    {
      category: "Frontend",
      items: ["React.js", "HTML5", "CSS3", "Responsive Design"],
    },
    {
      category: "Backend & Database",
      items: ["Node.js", "Express.js", "RESTful APIs", "PostgreSQL"],
    },
    {
      category: "Electrical & Embedded Systems",
      items: [
        "FPGA Design",
        "Power",
        "Signal Processing",
        "Analog & Digital Electronics",
        "Embedded C",
      ],
    },
    {
      category: "EDA & Simulation Tools",
      items: ["Altium Designer", "KiCad", "MATLAB", "Simulink"],
    },
  ],
  experience: [
    {
      company: "Wayfinder Labs",
      role: "Lead Creative Developer",
      period: "2022 — Present",
      highlights: [
        "Guided a cross-disciplinary team delivering immersive product demos for Fortune 100 clients.",
        "Architected a reusable WebGL micro-frontends system that cut integration time by 40%.",
      ],
    },
    {
      company: "Northwind Studio",
      role: "Senior Software Engineer",
      period: "2019 — 2022",
      highlights: [
        "Owned the interaction model for a city-building training tool across desktop and mixed reality.",
        "Built telemetry pipelines to evaluate player intent and inform UX decisions.",
      ],
    },
  ],
  contact: {
    email: "jaywu0045@gmail.com",
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
  skills: "Skills",
  experience: "Experience",
  contact: "Contact",
};
