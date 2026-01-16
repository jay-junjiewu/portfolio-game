const AuroraTransitDetails = () => {
  return (
    <section className="project-detail">
      <h3>Aurora Transit</h3>
      <p>
        Aurora Transit is a speculative transit planner that lets riders explore future routes through
        a stylized 3D city. The experience blends realtime path previews, ambient soundscapes, and
        spatial wayfinding so the journey feels as cinematic as the destination.
      </p>
      <p>
        The interface layers route heuristics on top of a city model, highlighting transfers and
        time savings with glowing corridor overlays. Each stop reveals contextual snapshots that help
        riders understand the neighborhood before they arrive.
      </p>

      <div className="project-gallery">
        {[1, 2, 3].map((index) => (
          <div key={index} className="project-thumb project-thumb-detail">
            <img src="/vite.svg" alt={`Aurora Transit preview ${index}`} />
          </div>
        ))}
      </div>

      <h4>What I focused on</h4>
      <ul>
        <li>Route visualization that feels like a guided tour rather than a static map.</li>
        <li>Interaction patterns that keep riders oriented while they orbit and zoom.</li>
        <li>Motion and audio cues that signal transfers and arrival moments.</li>
      </ul>
    </section>
  );
};

export default AuroraTransitDetails;
