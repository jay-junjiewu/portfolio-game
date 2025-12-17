import type { BuildingKey } from "./cityLayout";

export type ProjectCategory = "software" | "electrical";

export type Project = {
  title: string;
  description: string;
  stack: string[];
  category: ProjectCategory;
  date: string;
  image?: string;
  link?: string;
  externalLink?: string;
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

export const PORTFOLIO_DATA: PortfolioContent = {
  about: {
    headline: "Creative technologist crafting playful experiences.",
    body: [
      "I build responsive applications and interactive playgrounds that merge storytelling with solid engineering. The Pocket City concept reflects how I see product work—carefully planned neighborhoods that make exploration fun.",
      "When I am not prototyping with Babylon.js or React, you will find me sketching new city layouts on napkins or mentoring developers who want to push the browser into 3D.",
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
      link: "https://example.com/aurora",
      externalLink: "https://github.com/example/aurora",
      image: "/vite.svg",
    },
    {
      title: "Biolume AR Guide",
      category: "software",
      date: "February 2024",
      description:
        "Mobile web app blending AR portals with live environmental data for science museums.",
      stack: ["React Native Web", "Three.js", "Expo"],
      link: "https://example.com/biolume",
      externalLink: "https://dribbble.com/example/biolume",
      image: "/vite.svg",
    },
    {
      title: "Field Notes OS",
      category: "software",
      date: "October 2023",
      description:
        "Offline-first research companion for humanitarian field teams that syncs via WebRTC mesh networks.",
      stack: ["TypeScript", "IndexedDB", "WebRTC", "PWA"],
      link: "https://example.com/fieldnotes",
      externalLink: "https://github.com/example/fieldnotes",
      image: "/vite.svg",
    },
    {
      title: "Canvas Beats",
      category: "software",
      date: "June 2023",
      description:
        "Modular audio workstation in the browser with drag-to-patch synth nodes and multiplayer editing.",
      stack: ["React", "Tone.js", "Colyseus"],
      link: "https://example.com/canvasbeats",
      externalLink: "https://github.com/example/canvasbeats",
      image: "/vite.svg",
    },
    {
      title: "GridSense Edge Monitor",
      category: "electrical",
      date: "January 2024",
      description:
        "Low-power hardware module that logs sensor data and streams telemetry to a React dashboard for industrial sites.",
      stack: ["STM32", "LoRa", "MQTT", "React"],
      link: "https://example.com/gridsense",
      externalLink: "https://github.com/example/gridsense",
      image: "/vite.svg",
    },
    {
      title: "Solar Array Balancer",
      category: "electrical",
      date: "August 2023",
      description:
        "MPPT controller prototype with a companion SPA that visualizes live current/voltage curves and firmware updates.",
      stack: ["KiCad", "ESP32", "TypeScript", "D3.js"],
      link: "https://example.com/solar-array",
      externalLink: "https://github.com/example/solar-array",
      image: "/vite.svg",
    },
  ],
  skills: [
    {
      category: "Languages",
      items: ["TypeScript", "Python", "Go", "C#"],
    },
    {
      category: "Frontend",
      items: ["React", "Babylon.js", "Three.js", "Tailwind", "WebGL"],
    },
    {
      category: "Backend & DevOps",
      items: ["Node.js", "tRPC", "PostgreSQL", "Docker", "AWS"],
    },
    {
      category: "Creative Tech",
      items: ["Shader Graph", "Web Audio", "Game Feel", "UX Research"],
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
    email: "hello@creative.dev",
    location: "Remote · GMT-8",
    links: [
      { label: "GitHub", url: "https://github.com/example" },
      { label: "LinkedIn", url: "https://linkedin.com/in/example" },
      { label: "Dribbble", url: "https://dribbble.com/example" },
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
