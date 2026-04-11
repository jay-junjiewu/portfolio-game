const PersonalPortfolioDetails = () => {
  return (
    <section className="project-detail">
      <p>
        You are looking at this right now! This is my personal portfolio website, built with React
        and TypeScript to showcase my projects, skills, and experience in one centralised platform.
      </p>

      <div className="project-links">
        <a
          href="https://github.com/jay-junjiewu/portfolio-game"
          target="_blank"
          rel="noreferrer"
          className="chip chip-link"
        >
          GitHub
        </a>
      </div>

      <h3>3D city engine</h3>
      <p>
        The scene is powered by Babylon.js — a WebGL-based 3D engine running entirely in the
        browser. The city layout is defined as a typed data structure with grid-based building
        placements, animated vehicles, and a procedurally generated ground grid. Buildings are
        loaded from OBJ models with dynamic icon labels rendered onto canvas textures.
      </p>
      <p>
        Camera controls support keyboard (WASD pan, Q/E rotate), mouse drag, scroll zoom, and full
        touch gestures including pinch-to-zoom and two-finger rotation. Building selection uses
        raycasting with outline highlighting on hover.
      </p>

      <h3>React UI layer</h3>
      <p>
        The portfolio content panels sit on top of the 3D canvas as a React overlay. The site
        focuses on clean UI, responsive layouts, and maintainable component-based architecture, with
        local storage persistence for theme and filter preferences.
      </p>
    </section>
  );
};

export default PersonalPortfolioDetails;
