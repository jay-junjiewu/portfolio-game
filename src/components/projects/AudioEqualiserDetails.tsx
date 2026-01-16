import { useMemo, useState } from "react";

const AudioEqualiserDetails = () => {
  const carouselImages = [
    { src: "/assets/audio-equaliser/frequency.png", alt: "Frequency response tuning" },
    { src: "/assets/audio-equaliser/spectogram.png", alt: "Spectrogram view" },
    { src: "/assets/audio-equaliser/time.png", alt: "Time domain response" },
  ];
  const [activeIndex, setActiveIndex] = useState(0);
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
        This personal project is a Digital Audio Equaliser written purely using C++ STL (no external libraries) for processing audio signals. The equaliser reads in a .wav audio file and allows users to apply various gains to 5 frequency bands (sub-bass, bass, midrange, upper midrange, treble). It can also process stereo audio and save the result into a .wav file.
      </p>

      <div className="project-links">
        <a
          href="https://github.com/jay-junjiewu/audio-equaliser"
          target="_blank"
          rel="noreferrer"
          className="chip chip-link"
        >
          GitHub
        </a>
      </div>

      <h3>Filter design</h3>
      <p>
        The equaliser uses digital IIR filters that are logarithmically spaced to align with the sensitivity of human hearing, ensuring a natural and intuitive audio adjustment experience. These filters were first designed and tested using MATLAB to allow for precise tuning of filter coefficients before implementing them in C++.
      </p>
      <div className="hover-container">
        <img src="/assets/audio-equaliser/filters.png" alt="Filter response curves" />
      </div>

      <h3>MATLAB real-time prototype</h3>
      <p>
        As a prototype, I first designed a real-time equaliser in MATLAB before implementing it from scratch in C++. In MATLAB, the gain adjustment dynamically updates the filter parameters, directly influencing the time-domain signal. These adjustments span a wide range of gain levels, from subtle to significant, which can be observed in the time graph. To ensure smooth processing, a sliding window buffer is used to handle real-time audio data, continuously updating the signal as the sliders are adjusted. This buffer allows for efficient management of the audio stream, ensuring that the filter coefficients are recalculated in real-time. Updates to the frequency response and spectrogram occur in real-time, with minimal latency, providing seamless transitions and a smooth audio experience as the frequency spectrum is adjusted.
      </p>

      <div className="image-carousel" aria-label="MATLAB equaliser carousel">
        <div
          className="carousel-track"
          style={{
            transform: `translateX(-${activeIndex * 100}%)`,
            transition: "transform 0.35s ease",
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
      <div className="carousel-dots" role="tablist" aria-label="Choose MATLAB view">
        {carouselImages.map((_, index) => (
          <button
            key={`audio-eq-dot-${index}`}
            type="button"
            className={`carousel-dot ${index === currentIndex ? "active" : ""}`}
            onClick={() => setActiveIndex(index)}
            aria-label={`Go to slide ${index + 1}`}
            aria-pressed={index === currentIndex}
          />
        ))}
      </div>

      <h3>C++ equaliser implementation</h3>
      <p>
        The C++ equaliser begins by reading a .wav file and parsing its header to extract the metadata, including file size, sampling frequency, bit depth, and channel information. The implementation supports .wav files with any sampling frequency and can handle both mono and stereo audio formats. This process involves manually decoding the WAV file format's RIFF header structure. The raw audio data is then read into memory for processing.
      </p>
      <p>
        Users can specify gain adjustments for any of the five predefined frequency bands (sub-bass, bass, midrange, upper midrange, treble). The system applies zero-phase filtering to each band by performing forward and reverse digital filtering, ensuring no phase distortion. This filtering and gain adjustment are performed independently for each channel in stereo files. After processing, the modified audio data is recombined and can be saved back to a .wav file, preserving the original format and metadata.
      </p>
      <p>
        Additionally, users can apply dynamic range compression to control the audio signal's amplitude. This allows for precise adjustments to the threshold, which determines the level at which compression starts, the compression ratio, which defines the amount of reduction applied once the signal exceeds the threshold, and the make-up gain, which compensates for any volume loss caused by compression.
      </p>
      <p>
        The C++ code is in my{" "}
        <a
          href="https://github.com/jay-junjiewu/audio-equaliser"
          target="_blank"
          rel="noreferrer"
          className="text-link"
        >
          GitHub
        </a>
        . However, if you would like access to the MATLAB real-time equaliser source code, please feel
        free to contact me.
      </p>
    </section>
  );
};

export default AudioEqualiserDetails;
