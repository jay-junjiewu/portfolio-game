const VinoosDetails = () => {
  return (
    <section className="project-detail">
      <p>
        A responsive product catalog website built for a fish tank company, focusing on
        component-based architecture, reusable UI patterns, and high-quality visual presentation.
      </p>

      <div className="project-links">
        <a
          href="https://github.com/jay-junjiewu/Vinoos"
          target="_blank"
          rel="noreferrer"
          className="chip chip-link"
        >
          GitHub
        </a>
      </div>

      <div className="hover-container">
        <img src="/assets/vinoos/website_thumbnail.png" alt="Vinoos website screenshot" />
      </div>

      <h3>Overview</h3>
      <p>
        The site allows visitors to easily browse and view the company's products with an emphasis
        on clean layout and fast image loading. Built with React and modern JavaScript practices,
        the component architecture is designed to make adding new product categories straightforward.
      </p>
      <p>
        For the backend, Supabase handles image storage and delivery, keeping media assets separate
        from the codebase and enabling easy content updates without a redeployment.
      </p>
    </section>
  );
};

export default VinoosDetails;
