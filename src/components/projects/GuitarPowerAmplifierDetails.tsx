import { useMemo, useState } from "react";

const GuitarPowerAmplifierDetails = () => {
  const carouselImages = [
    { src: "/assets/guitar-power-amplifier/FCu.png", alt: "Top copper layer" },
    { src: "/assets/guitar-power-amplifier/In1Cu.png", alt: "Inner copper layer 1" },
    { src: "/assets/guitar-power-amplifier/In2Cu.png", alt: "Inner copper layer 2" },
    { src: "/assets/guitar-power-amplifier/BCu.png", alt: "Bottom copper layer" },
  ];
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitionEnabled, setIsTransitionEnabled] = useState(true);
  const lastIndex = carouselImages.length - 1;
  const slides = useMemo(() => carouselImages, [carouselImages]);
  const totalSlides = carouselImages.length;
  const currentIndex = totalSlides === 0 ? 0 : activeIndex;

  const handlePrev = () => {
    setActiveIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleNext = () => {
    setActiveIndex((prev) => Math.min(prev + 1, lastIndex));
  };

  return (
    <section className="project-detail">
      <p>
        This Class G guitar power amplifier is designed to drive loudspeakers with clear, high-quality
        audio while maintaining efficiency. It takes weak stereo signals from devices like audio jacks
        or microphones and amplifies them without losing signal integrity or introducing unwanted
        distortion. By preserving the shape of the audio signal across its frequency range, it ensures
        that the sound remains true to the original source.
      </p>

      <p>
        The amplifier features a multi-stage design, with separate stages for signal gain and power
        output, allowing for precise control over both audio clarity and power efficiency. This setup
        ensures that the amplifier delivers the right amount of power to the loudspeakers, making it
        ideal for high-performance audio applications.
      </p>

      <p>
        In addition to its core functionality, the amplifier includes advanced features like dynamic
        compression to prevent volume spikes and ensure a consistent output level, preventing
        distortion in high-volume situations. It also incorporates a noise gate to reduce unwanted
        noise, ensuring cleaner sound, and a dynamic compressor to manage volume levels, delivering a
        balanced audio experience and maintaining sound quality in any environment.
      </p>

      <div className="hover-container">
        <img src="/assets/guitar-power-amplifier/3D1.png" className="image-pe1-1" alt="3D rendering" />
      </div>

      <p>
        The amplifier design uses a 4-layer PCB in KiCad, with the outer layers for signal routing and
        inner layers for power delivery and grounding. This setup minimizes voltage drop and ground
        bounce, especially in the high-current Class G stage, while improving EMC and stability. A
        large heatsink ensures effective heat dissipation for the MOSFETs, preventing thermal runaway.
        The MOSFETs are insulated with thermal paste to avoid short circuits. Through-hole components
        are used in the power stage for better heat management and higher power handling, while the
        audio preamplifier uses SMD components for precision.
      </p>

      <div className="image-carousel" aria-label="PCB layer carousel">
        <div
          className="carousel-track"
          style={{
            transform: `translateX(-${activeIndex * 100}%)`,
            transition: isTransitionEnabled ? "transform 0.35s ease" : "none",
          }}
        >
          {slides.map((image, index) => (
            <div key={`${image.src}-${index}`} className="carousel-slide">
              <img src={image.src} alt={image.alt} />
            </div>
          ))}
        </div>
        <button
          type="button"
          className="carousel-button left"
          aria-label="Previous image"
          onClick={handlePrev}
        >
          &#10094;
        </button>
        <button
          type="button"
          className="carousel-button right"
          aria-label="Next image"
          onClick={handleNext}
        >
          &#10095;
        </button>
      </div>
      <div className="carousel-dots" role="tablist" aria-label="Choose PCB layer">
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

      <p>
        If you would like access to the schematics and diagrams of the amplifier's design, including
        the 4-layer PCB layout, signal routing, power delivery, grounding, and heat dissipation
        strategy, please feel free to contact me.
      </p>
    </section>
  );
};

export default GuitarPowerAmplifierDetails;
