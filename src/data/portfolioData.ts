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
      title: "Guitar Power Amplifier",
      category: "electrical",
      date: "September - December 2024",
      description:
        "A guitar power amplifier for loudspeakers that delivers clear, high-quality audio with optimal efficiency. It takes weak stereo signals from audio jacks or microphones, amplifies them, and preserves signal integrity while minimizing total harmonic distortion (THD). The design features a multi-stage cascaded approach with separate stages for signal gain and power output, offering precise control over both audio clarity and efficiency.",
      stack: ["Power Electronics", "PCB Design", "KiCad"],
      image: "/assets/guitar-power-amplifier/3D1.png",
    },
    {
      title: "Ambient Sound Monitor System",
      category: "electrical",
      date: "May - August 2024",
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
