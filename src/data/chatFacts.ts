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
      "Yes. He graduated from UNSW Sydney in December 2026 (Electrical Engineering and Computer Science) after a Software Engineering internship at Tencent, and is open to graduate software engineering roles (C++, low-latency, graphics/engine, embedded) and electrical engineering roles (FPGA/digital design, power electronics). For exact availability and start dates, email him at jaywu0046@gmail.com.",
  },
  {
    question: "What kind of roles or work is Junjie looking for?",
    answer:
      "STEP 1: If you don't yet know what the opportunity is, ask ONE short, open-ended question like \"What kind of role or opportunity do you have in mind?\". Do NOT name, list, or hint at any of the branches below in this question; keep it open-ended. " +
      "STEP 2: Once the visitor names the opportunity, identify which ONE of these six branches it best matches and share ONLY that branch's skills and interests (never reveal the list itself):\n" +
      "1) Software Engineering (SWE): C++, Python, multithreading, Linux, full-stack web (React, Next.js, Node.js, Flask, PostgreSQL, Docker), and low-level / high-performance systems programming; keen on performance-critical work.\n" +
      "2) Machine Learning (ML): PyTorch, Transformers, self-supervised learning, Scikit-learn; his honours thesis trained a 12.5M-parameter Conformer from scratch for privacy-preserving MCI (mild cognitive impairment) detection from speech, and he built an ML voltage-risk pipeline at Ausgrid.\n" +
      "3) Game Development & Graphics: C++, CUDA, GPU programming, Unreal Engine 5, graphics pipelines and graphics algorithms; he worked on game engine tooling at Tencent (June to December 2026).\n" +
      "4) Embedded Systems & FPGA: embedded C/C++, FreeRTOS, CAN, Verilog, FPGA / RTL design, Xilinx Vivado; built MPPT firmware for Sunswift Racing's world-record solar car and a 5-stage pipelined processor on FPGA.\n" +
      "5) Power Electronics & Electronics (incl. PCB): power electronics, analog electronics, signal processing, and PCB design (Altium, KiCad); projects include AtomCraft's supercapacitor pulsed power switching and control for plasma generation in nuclear fusion research, a 1 kW MPPT converter, and a guitar amplifier.\n" +
      "6) Power Systems / Consulting: electrical network planning, power systems, and data analysis; at Ausgrid he modelled voltage constraint risk from rooftop solar.\n" +
      "If the opportunity is unclear or spans several branches, briefly say he works across software and electrical engineering and ask which area they have in mind; don't list all six.",
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
