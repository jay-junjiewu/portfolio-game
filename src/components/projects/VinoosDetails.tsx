import Picture from "../Picture";

const VinoosDetails = () => {
  return (
    <section className="project-detail">
      <div className="project-links">
        <a
          href="https://github.com/jay-junjiewu/Vinoos"
          target="_blank"
          rel="noreferrer"
          className="pdf-link"
        >
          GitHub
        </a>
      </div>

      <div className="hover-container">
        <Picture src="/assets/vinoos/website_thumbnail.png" alt="Vinoos website screenshot" />
      </div>

      <h3>Overview</h3>
      <p>
        The site lets visitors browse the company's products, with an emphasis on polished
        visual presentation and fast image loading. It is built from reusable React components, so adding new product categories is straightforward.
      </p>
      <p>
        For the backend, Supabase handles image storage and delivery, keeping media assets separate
        from the codebase and enabling easy content updates without a redeployment.
      </p>
    </section>
  );
};

export default VinoosDetails;
