// Chat-only reference facts for the AI concierge (api/chat.ts).
//
// IMPORTANT: This data is for the chatbot ONLY. Do NOT import it into any site
// component or render it on the page — it exists purely as extra grounding so
// the assistant can answer the practical questions recruiters ask (availability,
// resume, how to get in touch) that aren't in the visible portfolio content.

export type ChatFact = { question: string; answer: string };

export const CHAT_FACTS: ChatFact[] = [
  {
    question: "Is Junjie open to work / available to hire?",
    answer:
      "Yes — he's a final-year UNSW student currently interning at Tencent, and is open to graduate / new-grad roles. For exact availability and start dates, email him at jaywu0046@gmail.com.",
  },
  {
    question: "What kind of roles or work is Junjie looking for?",
    answer:
      "Do NOT list every area at once. FIRST ask the visitor what kind of opportunity or role it is, then identify which ONE of these six branches it best matches and share only that branch's skills and interests:\n" +
      "1) Software Engineering (SWE): C++, Python, full-stack web (React, Node.js, Express, REST APIs, PostgreSQL), and low-level / high-performance systems programming; keen on backend and performance-critical work.\n" +
      "2) Machine Learning (ML): PyTorch, Transformers, deep learning, feature engineering, Pandas, Scikit-learn; his thesis is transformer-based speech anonymization and he's done ML for electrical-network planning.\n" +
      "3) Game Development: C++, Unreal Engine 5, C#, and .NET; currently doing game engine work at Tencent.\n" +
      "4) Embedded Systems & FPGA: embedded C/C++, firmware, FPGA and RTL design, Xilinx Vivado; built firmware for a world-record solar EV and a soft-core processor on FPGA.\n" +
      "5) Power Electronics & Electronics (incl. PCB): power electronics, analog & digital electronics, signal processing, and PCB design (Altium, KiCad); projects include pulsed-power research, an MPPT solar converter, and a guitar amplifier.\n" +
      "6) Power Systems / Consulting: electrical network planning, power systems, and data analysis; interned at Ausgrid modelling voltage risk from rooftop solar.\n" +
      "If the opportunity is unclear or spans several branches, briefly say he works across software and electrical engineering and ask which area they have in mind — don't list all six.",
  },
  {
    question: "Can I see Junjie's resume / CV?",
    answer:
      "Email him at jaywu0046@gmail.com stating the opportunity and he'll happily send his latest resume.",
  },
  {
    question: "What's the best way to contact Junjie, and how fast does he reply?",
    answer:
      "Email (jaywu0046@gmail.com) is best, or reach out on LinkedIn (https://www.linkedin.com/in/junjiewujay/). He typically replies within a day or two.",
  },
  {
    question: "Where is Junjie based? Is he open to relocation or does he have work rights?",
    answer:
      "He's based in Sydney, Australia. For relocation or work-authorization questions, please email him directly at jaywu0046@gmail.com.",
  },
  {
    question: "What is Junjie's strongest or favourite project?",
    answer:
      "A great place to start is this website itself or his C++ virtual memory emulator, or his work in a world record breaking EV project. Ask about any of them!",
  },
];
