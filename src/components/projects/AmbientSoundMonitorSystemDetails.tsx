import { useMemo, useState } from "react";

const AmbientSoundMonitorSystemDetails = () => {
  const carouselImages = [
    { src: "/assets/ambient-sound-monitor-system/pcb2d.png", alt: "PCB 2D layout" },
    { src: "/assets/ambient-sound-monitor-system/pcbfull.png", alt: "Full PCB layout" },
    { src: "/assets/ambient-sound-monitor-system/pcbpower.png", alt: "PCB power layout" },
  ];
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitionEnabled, setIsTransitionEnabled] = useState(true);
  const lastIndex = carouselImages.length - 1;
  const slides = useMemo(() => carouselImages, [carouselImages]);
  const currentIndex = carouselImages.length === 0 ? 0 : activeIndex;

  const handlePrev = () => {
    setActiveIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleNext = () => {
    setActiveIndex((prev) => Math.min(prev + 1, lastIndex));
  };

  return (
    <section className="project-detail">
      <p>
        Ambient Sound Monitor System (Xylyrnth) is an intelligent ambient sound monitoring system for
        the smartwatch market. It targets users who may struggle to stay aware of their surroundings
        or frequently operate in noisy environments. The system uses real-time processing to detect
        key sounds and deliver alerts through haptic and visual feedback.
      </p>

      <div className="project-links">
        <a
          href="https://github.com/jay-junjiewu/ambient-sound-monitor-system-xylyrnth"
          target="_blank"
          rel="noreferrer"
          className="chip chip-link"
        >
          GitHub
        </a>
        <a
          href="/assets/ambient-sound-monitor-system/Project_Xylyrnth.pdf"
          target="_blank"
          rel="noreferrer"
          className="chip chip-link"
        >
          Altium Schematics + Draftsman
        </a>
      </div>

      <h3>System overview</h3>
      <p>
        Xylyrnth is built around two custom ESP32 hardware boards, programmed in low-level embedded C.
        The boards communicate via Bluetooth and perform tightly synchronized tasks.
      </p>

      <h4>The master</h4>
      <ul>
        <li>Captures real-time audio data through an integrated microphone.</li>
        <li>Runs FFT and DSP routines to classify key sounds in real time.</li>
        <li>Delivers immediate alerts via haptics so users stay informed.</li>
      </ul>

      <h4>The slave</h4>
      <ul>
        <li>Provides an interface to configure sounds and alert behaviors.</li>
        <li>Drives a real-time LCD UI for settings and system status.</li>
      </ul>

      <h3>Technical details</h3>
      <p>
        The firmware is structured around FreeRTOS, enabling parallel processing across multiple
        real-time tasks, including audio capture, DSP, Bluetooth communication, and LCD updates. This
        provides precise control of hardware resources for efficient and reliable performance.
      </p>

      <h3>Operating principle</h3>
      <p>The system architecture and operation are illustrated below.</p>
      <div className="hover-container">
        <img
          src="/assets/ambient-sound-monitor-system/operating_flowchart.png"
          className="image-pe1-1"
          alt="Operating flowchart"
        />
      </div>

      <h3>Hardware</h3>
      <p>Here is the custom PCB designed and assembled for this project.</p>
      <div className="hover-container">
        <img
          src="/assets/ambient-sound-monitor-system/real-pcb.jpg"
          className="image-ps2-1"
          alt="Assembled PCB"
        />
      </div>

      <p>
        The 4-layer PCB was designed in Altium Designer with grounding strategies that reduce noise
        between the Bluetooth antenna and digital sections. The layout focuses on power integrity,
        signal integrity, and EMI control.
      </p>

      <div className="image-carousel" aria-label="PCB layout carousel">
        <div
          className="carousel-track"
          style={{
            transform: `translateX(-${activeIndex * 100}%)`,
            transition: isTransitionEnabled ? "transform 0.35s ease" : "none",
          }}
        >
          {slides.map((image) => (
            <div key={image.src} className="carousel-slide">
              <img src={image.src} alt={image.alt} />
            </div>
          ))}
        </div>
        <button
          type="button"
          className="carousel-button left"
          aria-label="Previous image"
          onClick={handlePrev}
          disabled={activeIndex === 0}
        >
          &#10094;
        </button>
        <button
          type="button"
          className="carousel-button right"
          aria-label="Next image"
          onClick={handleNext}
          disabled={activeIndex === lastIndex}
        >
          &#10095;
        </button>
      </div>
      <div className="carousel-dots" role="tablist" aria-label="Choose PCB layout">
        {carouselImages.map((_, index) => (
          <button
            key={`pcb-dot-${index}`}
            type="button"
            className={`carousel-dot ${index === currentIndex ? "active" : ""}`}
            onClick={() => setActiveIndex(index)}
            aria-label={`Go to slide ${index + 1}`}
            aria-pressed={index === currentIndex}
          />
        ))}
      </div>
    </section>
  );
};

export default AmbientSoundMonitorSystemDetails;
