const PersonalPortfolioDetails = () => {
  return (
    <section className="project-detail">
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
        The scene is powered by Babylon.js, a WebGL 3D engine running entirely in the
        browser. The city layout is defined as a typed data structure with building placements
        on a grid, animated vehicles, and a procedurally generated ground grid.
      </p>

      <h3>React UI layer</h3>
      <p>
        The portfolio content panels sit on top of the 3D canvas as a React overlay. The site
        focuses on clean UI, responsive layouts, and maintainable component architecture, with
        local storage persistence for theme and filter preferences.
      </p>
    </section>
  );
};

export default PersonalPortfolioDetails;
