import type { ComponentType } from "react";
import AmbientSoundMonitorSystemDetails from "./AmbientSoundMonitorSystemDetails";
import AudioEqualiserDetails from "./AudioEqualiserDetails";
import HonoursThesisDetails from "./HonoursThesisDetails";
import GuitarPowerAmplifierDetails from "./GuitarPowerAmplifierDetails";
import PersonalPortfolioDetails from "./PersonalPortfolioDetails";
import RankItDetails from "./RankItDetails";
import SunswiftDetails from "./SunswiftDetails";
import VirtualMemorySimulatorDetails from "./VirtualMemorySimulatorDetails";
import VinoosDetails from "./VinoosDetails";
import VoltagePlanningToolDetails from "./VoltagePlanningToolDetails";

/** Long-form write-ups, keyed by project slug. Projects without one show their summary only. */
export const PROJECT_DETAILS: Record<string, ComponentType> = {
  "honours-thesis-privacy-preserving-speech-ai": HonoursThesisDetails,
  "audio-equaliser-in-c": AudioEqualiserDetails,
  "guitar-power-amplifier": GuitarPowerAmplifierDetails,
  "ambient-sound-monitor-system": AmbientSoundMonitorSystemDetails,
  "sunswift-racing-mppt-project": SunswiftDetails,
  "machine-learning-and-voltage-risk-modelling": VoltagePlanningToolDetails,
  "virtual-memory-system-emulator-c": VirtualMemorySimulatorDetails,
  "personal-portfolio": PersonalPortfolioDetails,
  "vinoos-website-freelance": VinoosDetails,
  "rankit-website-hackathon": RankItDetails,
};

/** Source file of each write-up (used for the sitemap's lastmod). Keep in sync with the imports above. */
export const PROJECT_DETAIL_FILES: Record<string, string> = {
  "honours-thesis-privacy-preserving-speech-ai": "src/components/projects/HonoursThesisDetails.tsx",
  "audio-equaliser-in-c": "src/components/projects/AudioEqualiserDetails.tsx",
  "guitar-power-amplifier": "src/components/projects/GuitarPowerAmplifierDetails.tsx",
  "ambient-sound-monitor-system": "src/components/projects/AmbientSoundMonitorSystemDetails.tsx",
  "sunswift-racing-mppt-project": "src/components/projects/SunswiftDetails.tsx",
  "machine-learning-and-voltage-risk-modelling": "src/components/projects/VoltagePlanningToolDetails.tsx",
  "virtual-memory-system-emulator-c": "src/components/projects/VirtualMemorySimulatorDetails.tsx",
  "personal-portfolio": "src/components/projects/PersonalPortfolioDetails.tsx",
  "vinoos-website-freelance": "src/components/projects/VinoosDetails.tsx",
  "rankit-website-hackathon": "src/components/projects/RankItDetails.tsx",
};
